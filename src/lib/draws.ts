import "server-only";
import { fetchBeacon, QUICKNET, roundAt, roundTime, simulatedBeacon, winnerFromRandomness } from "./drand";
import { lotteryInfo } from "./lotteries";
import { eligibleNumbers, formatNumber, isEligible, lotteryNumber, reverseNumber } from "./raffle";
import { getRepo } from "./repo";
import type { Draw, LotteryResult, Prize, Raffle, Ticket } from "./types";

/** El simulador de drand solo existe fuera de producción (sin internet en desarrollo). */
export const DRAND_SIMULATED = process.env.NODE_ENV !== "production" && process.env.DRAND_SIMULATE === "1";

export function cutoffFor(raffle: Raffle, prize: Prize): string {
  return prize.paidBefore ?? raffle.paymentDeadline;
}

/** Números que ya ganaron un premio por ruleta en esta rifa. */
export function rouletteWinners(raffle: Raffle, exceptPrizeId?: string): number[] {
  return raffle.prizes
    .filter((p) => p.id !== exceptPrizeId && p.draw?.status === "done" && p.draw.roulette && p.draw.winningNumber !== undefined)
    .map((p) => p.draw!.winningNumber!);
}

/** Números que entrarían hoy a la ruleta de un premio. */
export function rouletteCandidates(raffle: Raffle, tickets: Ticket[], prize: Prize): number[] {
  const exclude = prize.excludePreviousWinners ? rouletteWinners(raffle, prize.id) : [];
  return eligibleNumbers(tickets, raffle.price, cutoffFor(raffle, prize), exclude);
}

function paid(raffle: Raffle, tickets: Ticket[], prize: Prize, n: number | null): boolean {
  if (n === null) return false;
  const t = tickets.find((x) => x.number === n);
  return !!t && isEligible(t, raffle.price, cutoffFor(raffle, prize));
}

const label = (raffle: Raffle, n: number) => formatNumber(n, raffle.numberCount);

async function save(raffle: Raffle, prize: Prize, draw: Draw | null, expect?: Draw["status"] | "none") {
  const ok = await getRepo().setDraw(raffle.id, prize.id, draw, expect);
  if (!ok) throw new Error("El sorteo cambió mientras tanto. Recarga la página.");
}

const expectOf = (prize: Prize): Draw["status"] | "none" => prize.draw?.status ?? "none";

/** Aplica el resultado de una lotería a un premio `lottery`. */
export async function applyLottery(raffle: Raffle, tickets: Ticket[], prize: Prize, result: LotteryResult) {
  if (prize.method !== "lottery") throw new Error("Este premio no se juega por lotería");
  if (prize.draw?.status === "done" || prize.draw?.roulette) throw new Error("Este premio ya tiene resultado");
  const n = lotteryNumber(result.number, raffle.numberCount);
  if (n === null) throw new Error("Ese resultado no sirve para esta rifa");
  const name = lotteryInfo(result.lotteryKey).name;
  const head = `${name} jugó ${result.number}${result.serie ? ` serie ${result.serie}` : ""}`;
  if (paid(raffle, tickets, prize, n)) {
    await save(
      raffle,
      prize,
      { status: "done", lottery: result, winningNumber: n, note: `${head}: gana el ${label(raffle, n)}.`, doneAt: new Date().toISOString() },
      expectOf(prize),
    );
  } else {
    await fallback(raffle, prize, result, `${head}: el ${label(raffle, n)} no estaba pagado.`);
  }
}

async function fallback(raffle: Raffle, prize: Prize, lottery: LotteryResult, reason: string) {
  const draw: Draw =
    prize.fallback === "roulette"
      ? { status: "scheduled", lottery, note: `${reason} Se sortea en ruleta entre los números pagados.` }
      : { status: "void", lottery, note: `${reason} Premio desierto.`, doneAt: new Date().toISOString() };
  await save(raffle, prize, draw, expectOf(prize));
}

/** Calcula un premio `reverse` con el resultado de lotería de su premio de origen. */
export async function applyReverse(raffle: Raffle, tickets: Ticket[], prize: Prize) {
  if (prize.method !== "reverse") throw new Error("Este premio no es de número invertido");
  if (prize.draw) throw new Error("Este premio ya tiene resultado");
  const source = raffle.prizes.find((p) => p.position === prize.sourcePosition);
  const lottery = source?.draw?.lottery;
  if (!lottery) throw new Error("Primero registra el resultado de la lotería del premio de origen");
  const base = lotteryNumber(lottery.number, raffle.numberCount);
  const rev = base === null ? null : reverseNumber(base, raffle.numberCount);
  if (rev !== null && rev !== base && paid(raffle, tickets, prize, rev)) {
    await save(
      raffle,
      prize,
      {
        status: "done",
        lottery,
        winningNumber: rev,
        note: `Al revés del ${label(raffle, base!)} es el ${label(raffle, rev)}: gana el ${label(raffle, rev)}.`,
        doneAt: new Date().toISOString(),
      },
      "none",
    );
  } else {
    const why =
      rev === null
        ? "El número invertido no existe en esta rifa."
        : rev === base
          ? `El ${label(raffle, rev)} al revés es el mismo número.`
          : `El número al revés (${label(raffle, rev)}) no estaba pagado.`;
    await fallback(raffle, prize, lottery, why);
  }
}

/** ¿Este premio necesita (o puede tener) ruleta ahora? */
export function canSchedule(prize: Prize): boolean {
  if (prize.draw?.roulette) return false;
  if (prize.method === "roulette") return !prize.draw;
  return prize.draw?.status === "scheduled"; // lotería o invertido que pasó a ruleta
}

/**
 * Programa la ruleta: fija la lista de elegibles y una ronda futura de drand.
 * Desde este momento nadie, ni quien organiza, puede cambiar el resultado.
 */
export async function scheduleRoulette(raffle: Raffle, tickets: Ticket[], prize: Prize, at: Date) {
  if (!canSchedule(prize)) throw new Error("Este premio no se puede programar ahora");
  const minAt = Date.now() + 10_000;
  const round = roundAt(Math.max(at.getTime(), minAt));
  const eligible = rouletteCandidates(raffle, tickets, prize);
  if (eligible.length === 0) throw new Error("No hay números pagados que puedan participar");
  const draw: Draw = {
    status: "scheduled",
    lottery: prize.draw?.lottery,
    note: prize.draw?.note ?? "",
    roulette: {
      chainHash: QUICKNET.chainHash,
      round,
      roundTime: roundTime(round).toISOString(),
      eligible,
      ...(DRAND_SIMULATED ? { simulated: true } : {}),
    },
  };
  await save(raffle, prize, draw, expectOf(prize));
}

/** Resuelve las ruletas cuya ronda ya salió. Seguro de llamar en cada carga. */
export async function resolveDue(raffle: Raffle): Promise<boolean> {
  let changed = false;
  for (const prize of raffle.prizes) {
    const d = prize.draw;
    const r = d?.roulette;
    if (d?.status !== "scheduled" || !r || r.randomness || Date.parse(r.roundTime) > Date.now()) continue;
    const beacon = r.simulated ? await simulatedBeacon(r.round) : await fetchBeacon(r.round);
    if (!beacon) continue;
    const { number } = winnerFromRandomness(beacon.randomness, r.eligible);
    const ok = await getRepo().setDraw(
      raffle.id,
      prize.id,
      {
        ...d,
        status: "done",
        winningNumber: number,
        roulette: { ...r, randomness: beacon.randomness, signature: beacon.signature },
        note: `${d.note ? d.note + " " : ""}La ruleta (ronda ${r.round} de drand) eligió el ${label(raffle, number)}.`.trim(),
        doneAt: new Date().toISOString(),
      },
      "scheduled",
    );
    changed ||= ok;
  }
  return changed;
}

/**
 * Deshace un sorteo. Una ruleta solo se puede cancelar antes de que salga
 * su ronda (nadie conoce aún el resultado); después es definitiva.
 */
export async function resetDraw(raffle: Raffle, prize: Prize) {
  const d = prize.draw;
  if (!d) return;
  if (d.roulette) {
    if (Date.parse(d.roulette.roundTime) <= Date.now() + 2000)
      throw new Error("La ronda de drand ya salió: el resultado es definitivo");
    // Volver al estado anterior a programar la ruleta.
    await save(raffle, prize, d.lottery ? { status: "scheduled", lottery: d.lottery, note: d.note } : null, d.status);
    return;
  }
  const dependents = raffle.prizes.filter((p) => p.method === "reverse" && p.sourcePosition === prize.position && p.draw);
  if (dependents.length > 0) throw new Error(`Primero deshaz el premio ${dependents[0].position}, que depende de este`);
  await save(raffle, prize, null, d.status);
}

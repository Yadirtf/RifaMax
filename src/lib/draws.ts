import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { draws, type Prize } from "@/db/schema";
import type { RaffleBundle } from "./data";
import {
  eligibleNumbers,
  formatNumber,
  generateSeed,
  isEligible,
  lotteryNumber,
  pickWinner,
  reverseNumber,
  sha256Hex,
} from "./raffle";

/** Fecha límite de pago que aplica a un premio. */
export function cutoffFor(b: RaffleBundle, prize: Prize): string {
  return prize.paidBefore ?? b.raffle.paymentDeadline;
}

/** Números que ya ganaron un premio por ruleta en esta rifa. */
export function rouletteWinners(b: RaffleBundle, exceptPrizeId?: number): number[] {
  const out: number[] = [];
  for (const d of b.draws.values()) {
    if (d.prizeId === exceptPrizeId) continue;
    if (d.status === "done" && d.eligible && d.winningNumber !== null) out.push(d.winningNumber);
  }
  return out;
}

/** Números que entrarían hoy a la ruleta de un premio. */
export function rouletteCandidates(b: RaffleBundle, prize: Prize): number[] {
  const exclude = prize.excludePreviousWinners ? rouletteWinners(b, prize.id) : [];
  return eligibleNumbers(b.tickets, b.raffle.price, cutoffFor(b, prize), exclude);
}

function paidNumber(b: RaffleBundle, prize: Prize, n: number | null): boolean {
  if (n === null) return false;
  const t = b.tickets.find((x) => x.number === n);
  return !!t && isEligible(t, b.raffle.price, cutoffFor(b, prize));
}

async function upsertDraw(prizeId: number, values: Partial<typeof draws.$inferInsert> & { status: "committed" | "done" | "void" }) {
  await db
    .insert(draws)
    .values({ prizeId, ...values })
    .onConflictDoUpdate({ target: draws.prizeId, set: values });
}

async function commitRoulette(prizeId: number, extra: { lotteryResult?: string; note?: string } = {}) {
  const seed = generateSeed();
  await upsertDraw(prizeId, {
    status: "committed",
    seed,
    seedHash: await sha256Hex(seed),
    lotteryResult: extra.lotteryResult ?? null,
    note: extra.note ?? "",
    eligible: null,
    winningNumber: null,
    doneAt: null,
  });
}

async function fallbackOrVoid(b: RaffleBundle, prize: Prize, lotteryResult: string, reason: string) {
  if (prize.fallback === "roulette") {
    await commitRoulette(prize.id, { lotteryResult, note: `${reason} Se sortea por ruleta entre los números pagados.` });
  } else {
    await upsertDraw(prize.id, { status: "void", lotteryResult, note: `${reason} Premio desierto.`, doneAt: new Date().toISOString() });
  }
}

/** Registra el resultado oficial de la lotería para un premio `lottery`. */
export async function recordLottery(b: RaffleBundle, prize: Prize, result: string) {
  if (prize.method !== "lottery") throw new Error("Este premio no se juega por lotería");
  const n = lotteryNumber(result, b.raffle.numberCount);
  if (n === null) throw new Error("Resultado inválido para esta rifa");
  const label = formatNumber(n, b.raffle.numberCount);
  if (paidNumber(b, prize, n)) {
    await upsertDraw(prize.id, {
      status: "done",
      lotteryResult: result,
      winningNumber: n,
      note: `${prize.lotteryName ?? "La lotería"} jugó ${result}: gana el ${label}.`,
      seed: null,
      seedHash: null,
      eligible: null,
      doneAt: new Date().toISOString(),
    });
  } else {
    await fallbackOrVoid(b, prize, result, `${prize.lotteryName ?? "La lotería"} jugó ${result}: el ${label} no estaba pagado.`);
  }
}

/** Calcula un premio `reverse` a partir del resultado de su premio de origen. */
export async function computeReverse(b: RaffleBundle, prize: Prize) {
  if (prize.method !== "reverse") throw new Error("Este premio no es de número invertido");
  const source = b.prizes.find((p) => p.position === prize.sourcePosition);
  const sourceDraw = source && b.draws.get(source.id);
  if (!sourceDraw?.lotteryResult) throw new Error("Primero registra el resultado de la lotería del premio de origen");
  const base = lotteryNumber(sourceDraw.lotteryResult, b.raffle.numberCount);
  const rev = base === null ? null : reverseNumber(base, b.raffle.numberCount);
  const label = rev === null ? "—" : formatNumber(rev, b.raffle.numberCount);
  if (rev !== null && rev !== base && paidNumber(b, prize, rev)) {
    await upsertDraw(prize.id, {
      status: "done",
      lotteryResult: sourceDraw.lotteryResult,
      winningNumber: rev,
      note: `Número invertido del premio ${source!.position}: gana el ${label}.`,
      doneAt: new Date().toISOString(),
    });
  } else {
    const why = rev === base ? `El número invertido es el mismo (${label}).` : `El número invertido ${label} no estaba pagado.`;
    await fallbackOrVoid(b, prize, sourceDraw.lotteryResult, why);
  }
}

/** Genera la semilla y publica su hash: la ruleta queda lista para girar. */
export async function prepareRoulette(prize: Prize) {
  if (prize.method !== "roulette") throw new Error("Este premio no se juega por ruleta");
  await commitRoulette(prize.id);
}

/** Gira la ruleta: revela la semilla y fija el ganador. */
export async function spinRoulette(b: RaffleBundle, prize: Prize) {
  const draw = b.draws.get(prize.id);
  if (!draw || draw.status !== "committed" || !draw.seed) throw new Error("Primero prepara la ruleta");
  const eligible = rouletteCandidates(b, prize);
  if (eligible.length === 0) {
    await db
      .update(draws)
      .set({ status: "void", eligible: "[]", note: `${draw.note} No hay números elegibles.`.trim(), doneAt: new Date().toISOString() })
      .where(eq(draws.prizeId, prize.id));
    return null;
  }
  const { index, number } = await pickWinner(draw.seed, eligible);
  await db
    .update(draws)
    .set({
      status: "done",
      eligible: JSON.stringify(eligible),
      winningNumber: number,
      note: `${draw.note} Gana el ${formatNumber(number, b.raffle.numberCount)}.`.trim(),
      doneAt: new Date().toISOString(),
    })
    .where(eq(draws.prizeId, prize.id));
  return { eligible, index, number, seed: draw.seed };
}

export async function resetDraw(prizeId: number) {
  await db.delete(draws).where(eq(draws.prizeId, prizeId));
}

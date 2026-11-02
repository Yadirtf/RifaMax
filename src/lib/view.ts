import type { RaffleBundle } from "./data";
import { lotteryInfo } from "./lotteries";
import { digitsFor, formatNumber, ticketState, type TicketState } from "./raffle";
import type { Draw, Prize, Raffle } from "./types";

/** Lo que ve cualquier visitante: sin teléfonos ni apellidos. */
export interface PublicCell {
  n: number;
  label: string;
  state: TicketState;
  owner?: string;
}

export interface PublicPrize extends Omit<Prize, "draw"> {
  howLabel: string;
  lotteryName?: string;
  lotteryUrl?: string;
  draw?: Draw & { winnerLabel?: string; winnerName?: string };
}

export interface PublicView {
  raffle: Omit<Raffle, "prizes">;
  cells: PublicCell[];
  prizes: PublicPrize[];
  stats: { free: number; reserved: number; partial: number; paid: number; taken: number; prizesTotal: number };
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export function howLabel(prize: Prize, raffle: Pick<Raffle, "numberCount" | "prizes">): string {
  if (prize.method === "lottery") return `Últimas ${digitsFor(raffle.numberCount)} cifras · ${lotteryInfo(prize.lotteryKey).name}`;
  if (prize.method === "reverse") return `Número al revés del premio ${prize.sourcePosition}`;
  return "Ruleta en vivo con drand";
}

export function toPublicView({ raffle, tickets }: RaffleBundle): PublicView {
  const byNumber = new Map(tickets.map((t) => [t.number, t]));
  const cells: PublicCell[] = Array.from({ length: raffle.numberCount }, (_, n) => {
    const t = byNumber.get(n);
    return { n, label: formatNumber(n, raffle.numberCount), state: ticketState(t, raffle.price), owner: t ? firstName(t.player.name) : undefined };
  });
  const count = (s: TicketState) => cells.filter((c) => c.state === s).length;
  const { prizes, ...rest } = raffle;
  return {
    raffle: rest,
    cells,
    prizes: prizes.map((p) => {
      const info = p.method === "lottery" || p.draw?.lottery ? lotteryInfo(p.lotteryKey ?? p.draw?.lottery?.lotteryKey) : undefined;
      const w = p.draw?.winningNumber;
      return {
        ...p,
        howLabel: howLabel(p, raffle),
        lotteryName: info?.name,
        lotteryUrl: info?.resultsUrl,
        draw: p.draw && {
          ...p.draw,
          winnerLabel: w === undefined ? undefined : formatNumber(w, raffle.numberCount),
          winnerName: w === undefined ? undefined : byNumber.get(w) && firstName(byNumber.get(w)!.player.name),
        },
      };
    }),
    stats: {
      free: count("free"),
      reserved: count("reserved"),
      partial: count("partial"),
      paid: count("paid"),
      taken: raffle.numberCount - count("free"),
      prizesTotal: raffle.prizes.reduce((s, p) => s + p.value, 0),
    },
  };
}

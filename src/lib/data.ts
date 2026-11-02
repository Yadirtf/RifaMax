import "server-only";
import { resolveDue } from "./draws";
import { getRepo } from "./repo";
import type { Raffle, Ticket } from "./types";

export interface RaffleBundle {
  raffle: Raffle;
  tickets: Ticket[];
}

/** Carga una rifa con sus números, resolviendo antes las ruletas cuya ronda ya salió. */
export async function getBundle(by: { id: string } | { slug: string }): Promise<RaffleBundle | null> {
  const repo = getRepo();
  let raffle = await repo.getRaffle(by);
  if (!raffle) return null;
  if (await resolveDue(raffle).catch(() => false)) raffle = (await repo.getRaffle(by))!;
  return { raffle, tickets: await repo.listTickets(raffle.id) };
}

export async function listRaffles() {
  return getRepo().listRaffles();
}

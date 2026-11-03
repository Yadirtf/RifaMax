import "server-only";
import { expiredMessage, logEvent, notifyAdmin } from "./activity";
import { resolveDue } from "./draws";
import { expiryCutoff, isExpired } from "./hold";
import { getRepo } from "./repo";
import type { Repo } from "./repo/types";
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
  const tickets = await repo.listTickets(raffle.id);
  const released = await releaseExpired(repo, raffle, tickets).catch(() => new Set<string>());
  return { raffle, tickets: released.size ? tickets.filter((t) => !released.has(t.id)) : tickets };
}

/**
 * Libera los apartados hechos desde la página que vencieron sin abono ni confirmación.
 * Se hace al cargar la rifa (no hace falta un cron); cada borrado es atómico.
 */
async function releaseExpired(repo: Repo, raffle: Raffle, tickets: Ticket[]): Promise<Set<string>> {
  const now = Date.now();
  const due = tickets.filter((t) => isExpired(t, raffle, now));
  const released = new Set<string>();
  if (due.length === 0) return released;
  const cutoff = expiryCutoff(raffle, now);
  for (const t of due) {
    if (await repo.releaseIfUnclaimed(raffle.id, t.id, cutoff)) {
      released.add(t.id);
      await logEvent(repo, { raffleId: raffle.id, type: "expired", by: "system", number: t.number, name: t.player.name, phone: t.player.phone });
    }
  }
  if (released.size) {
    const items = due.filter((t) => released.has(t.id)).map((t) => ({ number: t.number, name: t.player.name }));
    await notifyAdmin(repo, expiredMessage(raffle, items));
  }
  return released;
}

export async function listRaffles() {
  return getRepo().listRaffles();
}

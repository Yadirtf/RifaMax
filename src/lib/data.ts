import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { draws, players, prizes, raffles, tickets, type Draw, type Player, type Prize, type Raffle, type Ticket } from "@/db/schema";

export type TicketWithPlayer = Ticket & { player: Player };

export interface RaffleBundle {
  raffle: Raffle;
  prizes: Prize[];
  tickets: TicketWithPlayer[];
  draws: Map<number, Draw>;
}

async function bundle(raffle: Raffle | undefined): Promise<RaffleBundle | null> {
  if (!raffle) return null;
  const prizeRows = await db
    .select()
    .from(prizes)
    .where(eq(prizes.raffleId, raffle.id))
    .orderBy(asc(prizes.position));
  const ticketRows = await db
    .select()
    .from(tickets)
    .innerJoin(players, eq(tickets.playerId, players.id))
    .where(eq(tickets.raffleId, raffle.id))
    .orderBy(asc(tickets.number));
  const drawRows =
    prizeRows.length === 0
      ? []
      : await db
          .select()
          .from(draws)
          .where(inArray(draws.prizeId, prizeRows.map((p) => p.id)));
  return {
    raffle,
    prizes: prizeRows,
    tickets: ticketRows.map((r) => ({ ...r.tickets, player: r.players })),
    draws: new Map(drawRows.map((d) => [d.prizeId, d])),
  };
}

export async function getRaffleBySlug(slug: string) {
  const [raffle] = await db.select().from(raffles).where(eq(raffles.slug, slug));
  return bundle(raffle);
}

export async function getRaffleById(id: number) {
  const [raffle] = await db.select().from(raffles).where(eq(raffles.id, id));
  return bundle(raffle);
}

export async function listRaffles() {
  return db.select().from(raffles).orderBy(asc(raffles.drawDate));
}

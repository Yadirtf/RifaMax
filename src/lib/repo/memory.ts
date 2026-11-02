import type { Raffle, Ticket } from "../types";
import { christmasRaffle } from "./seed";
import type { Repo } from "./types";

/**
 * Repositorio en memoria para desarrollo y pruebas sin MongoDB.
 * Se reinicia al reiniciar el servidor. Nunca se usa en producción.
 */
interface Store {
  raffles: Map<string, Raffle>;
  tickets: Map<string, Ticket>;
  seq: number;
}

const g = globalThis as unknown as { rifamaxMemory?: Store };

function store(): Store {
  if (!g.rifamaxMemory) {
    const s: Store = { raffles: new Map(), tickets: new Map(), seq: 1 };
    const id = "r" + s.seq++;
    s.raffles.set(id, { id, createdAt: new Date().toISOString(), ...christmasRaffle() });
    if (process.env.RIFAMAX_DEMO_TICKETS === "1") seedDemoTickets(s, id);
    g.rifamaxMemory = s;
  }
  return g.rifamaxMemory;
}

const clone = <T>(v: T): T => structuredClone(v);

export function memoryRepo(): Repo {
  return {
    async listRaffles() {
      return [...store().raffles.values()].sort((a, b) => a.drawDate.localeCompare(b.drawDate)).map(clone);
    },
    async getRaffle(by) {
      const s = store();
      const r = "id" in by ? s.raffles.get(by.id) : [...s.raffles.values()].find((x) => x.slug === by.slug);
      return r ? clone(r) : null;
    },
    async createRaffle(raffle) {
      const s = store();
      if ([...s.raffles.values()].some((r) => r.slug === raffle.slug)) return { ok: false, reason: "slug" };
      const id = "r" + s.seq++;
      s.raffles.set(id, { ...clone(raffle), id, createdAt: new Date().toISOString() });
      return { ok: true, id };
    },
    async updateRaffle(id, patch) {
      const r = store().raffles.get(id);
      if (r) Object.assign(r, clone(patch));
    },
    async setDraw(raffleId, prizeId, draw, expect) {
      const p = store()
        .raffles.get(raffleId)
        ?.prizes.find((x) => x.id === prizeId);
      if (!p) return false;
      if (expect === "none" && p.draw) return false;
      if (expect && expect !== "none" && p.draw?.status !== expect) return false;
      if (draw) p.draw = clone(draw);
      else delete p.draw;
      return true;
    },
    async listTickets(raffleId) {
      return [...store().tickets.values()]
        .filter((t) => t.raffleId === raffleId)
        .sort((a, b) => a.number - b.number)
        .map(clone);
    },
    async findTicketsByPhone(raffleId, phone) {
      return (await this.listTickets(raffleId)).filter((t) => t.player.phone === phone);
    },
    async reserveTicket(raffleId, number, player) {
      const s = store();
      if ([...s.tickets.values()].some((t) => t.raffleId === raffleId && t.number === number)) return null;
      const t: Ticket = {
        id: "t" + s.seq++,
        raffleId,
        number,
        player: clone(player),
        paidAmount: 0,
        paidInFullAt: null,
        payments: [],
        createdAt: new Date().toISOString(),
      };
      s.tickets.set(t.id, t);
      return clone(t);
    },
    async addPayment(raffleId, ticketId, payment, price) {
      const t = store().tickets.get(ticketId);
      if (!t || t.raffleId !== raffleId || payment.amount <= 0 || t.paidAmount + payment.amount > price) return null;
      t.paidAmount += payment.amount;
      t.payments.push(clone(payment));
      t.paidInFullAt = t.paidAmount >= price ? payment.at : null;
      return clone(t);
    },
    async releaseTicket(raffleId, ticketId) {
      const s = store();
      if (s.tickets.get(ticketId)?.raffleId === raffleId) s.tickets.delete(ticketId);
    },
  };
}

/** Jugadores de ejemplo para ver el sistema con movimiento (solo con RIFAMAX_DEMO_TICKETS=1). */
function seedDemoTickets(s: Store, raffleId: string) {
  const names = ["Marling", "Andrés", "Luisa", "Camilo", "Valentina", "Jhon", "Paola", "Sebastián", "Daniela", "Felipe", "Karen", "Mateo", "Sara", "Julián"];
  const picks = [3, 7, 12, 18, 21, 25, 33, 37, 41, 44, 50, 55, 58, 61, 66, 70, 73, 77, 82, 88, 90, 94, 99, 5, 14, 29];
  picks.forEach((number, i) => {
    const paid = i % 5 === 0 ? 0 : i % 3 === 0 ? 10000 : 20000;
    const at = new Date(Date.UTC(2026, 10, 3 + (i % 20), 15)).toISOString();
    s.tickets.set("t" + s.seq, {
      id: "t" + s.seq++,
      raffleId,
      number,
      player: { name: `${names[i % names.length]} Demo`, phone: `30000000${String(i).padStart(2, "0")}` },
      paidAmount: paid,
      paidInFullAt: paid >= 20000 ? at : null,
      payments: paid ? [{ amount: paid, method: "nequi", note: "", at }] : [],
      createdAt: at,
    });
  });
}

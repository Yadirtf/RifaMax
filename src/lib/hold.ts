import type { Raffle, Ticket } from "./types";

/** Apartados desde la página sin abono ni confirmación: cuánto duran y cuándo vencen. */
export const DEFAULT_HOLD_HOURS = 48;

export const holdHoursOf = (raffle: Pick<Raffle, "holdHours">) =>
  typeof raffle.holdHours === "number" && raffle.holdHours >= 0 ? raffle.holdHours : DEFAULT_HOLD_HOURS;

/** Un apartado está "por confirmar" si lo hizo el jugador, no tiene abonos y nadie lo ha fijado. */
export function isUnconfirmed(t: Pick<Ticket, "source" | "confirmedAt" | "paidAmount">): boolean {
  return t.source === "online" && !t.confirmedAt && t.paidAmount === 0;
}

/** Fecha en que vence el apartado, o null si no vence. */
export function expiresAt(t: Pick<Ticket, "source" | "confirmedAt" | "paidAmount" | "createdAt">, raffle: Pick<Raffle, "holdHours">): Date | null {
  const h = holdHoursOf(raffle);
  if (!isUnconfirmed(t) || h === 0) return null;
  return new Date(Date.parse(t.createdAt) + h * 3_600_000);
}

export const isExpired = (t: Parameters<typeof expiresAt>[0], raffle: Pick<Raffle, "holdHours">, now = Date.now()) => {
  const e = expiresAt(t, raffle);
  return e !== null && e.getTime() <= now;
};

/** Hora límite para crear el apartado: lo creado antes de esto ya venció. */
export const expiryCutoff = (raffle: Pick<Raffle, "holdHours">, now = Date.now()) => new Date(now - holdHoursOf(raffle) * 3_600_000).toISOString();

export const cleanPhone = (s: string) => s.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");

export const isBlocked = (raffle: Pick<Raffle, "blockedPhones">, phone: string) => !!phone && (raffle.blockedPhones ?? []).includes(phone);

/** "en 31 h", "en 45 min" */
export function timeLeft(ms: number): string {
  if (ms <= 0) return "ya venció";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `en ${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `en ${h} h` : `en ${Math.floor(h / 24)} días`;
}

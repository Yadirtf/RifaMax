/**
 * Reglas del juego, sin dependencias de base de datos ni de React.
 * Funciona igual en el servidor y en el navegador (usa Web Crypto).
 */

export type TicketState = "free" | "reserved" | "partial" | "paid";

export interface TicketLike {
  number: number;
  paidAmount: number;
  paidInFullAt: string | null;
}

/** Cantidad de cifras de los números: 100 => 2 (00..99), 1000 => 3. */
export function digitsFor(numberCount: number): number {
  return Math.max(1, String(numberCount - 1).length);
}

export function formatNumber(n: number, numberCount: number): string {
  return String(n).padStart(digitsFor(numberCount), "0");
}

export function ticketState(ticket: TicketLike | undefined, price: number): TicketState {
  if (!ticket) return "free";
  if (ticket.paidAmount >= price) return "paid";
  if (ticket.paidAmount > 0) return "partial";
  return "reserved";
}

/**
 * Número ganador a partir del resultado de una lotería: últimas cifras.
 * Devuelve null si el resultado no sirve o el número no existe en la rifa.
 */
export function lotteryNumber(result: string, numberCount: number): number | null {
  const clean = result.replace(/\D/g, "");
  const digits = digitsFor(numberCount);
  if (clean.length < digits) return null;
  const n = Number(clean.slice(-digits));
  return n < numberCount ? n : null;
}

/** Número invertido: 37 -> 73, 05 -> 50. */
export function reverseNumber(n: number, numberCount: number): number | null {
  const reversed = Number(formatNumber(n, numberCount).split("").reverse().join(""));
  return reversed < numberCount ? reversed : null;
}

/** Fecha (YYYY-MM-DD) en hora de Colombia (UTC-5, sin horario de verano). */
export function colombiaDate(iso: string): string {
  const t = new Date(iso).getTime() - 5 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/** ¿El número estaba pagado completo a tiempo para participar? */
export function isEligible(ticket: TicketLike, price: number, cutoffDate: string): boolean {
  if (ticket.paidAmount < price || !ticket.paidInFullAt) return false;
  return colombiaDate(ticket.paidInFullAt) <= cutoffDate;
}

export function eligibleNumbers(
  tickets: TicketLike[],
  price: number,
  cutoffDate: string,
  exclude: Iterable<number> = [],
): number[] {
  const skip = new Set(exclude);
  return tickets
    .filter((t) => isEligible(t, price, cutoffDate) && !skip.has(t.number))
    .map((t) => t.number)
    .sort((a, b) => a - b);
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Utilidades de presentación
// ---------------------------------------------------------------------------

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Enlace de WhatsApp con mensaje prellenado. */
export function whatsappLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "");
  const to = clean.length === 10 ? `57${clean}` : clean;
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
}

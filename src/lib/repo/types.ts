import type { Draw, NewRaffle, Payment, Raffle, Ticket } from "../types";

export type RaffleInfoPatch = Partial<
  Pick<Raffle, "name" | "description" | "paymentInfo" | "organizerPhone" | "status" | "goal" | "theme">
>;

/**
 * Acceso a datos. Hay dos implementaciones con el mismo contrato:
 * MongoDB (producción) y memoria (desarrollo y pruebas sin base de datos).
 * Todas las escrituras que compiten entre sí son atómicas en un solo documento.
 */
export interface Repo {
  listRaffles(): Promise<Raffle[]>;
  getRaffle(by: { id: string } | { slug: string }): Promise<Raffle | null>;
  createRaffle(raffle: NewRaffle): Promise<{ ok: true; id: string } | { ok: false; reason: "slug" }>;
  updateRaffle(id: string, patch: RaffleInfoPatch): Promise<void>;
  /**
   * Guarda (o borra con null) el sorteo de un premio.
   * `expect` exige el estado actual: "none" = sin sorteo. Devuelve false si no coincidía.
   */
  setDraw(raffleId: string, prizeId: string, draw: Draw | null, expect?: Draw["status"] | "none"): Promise<boolean>;

  listTickets(raffleId: string): Promise<Ticket[]>;
  findTicketsByPhone(raffleId: string, phone: string): Promise<Ticket[]>;
  /** Aparta un número libre. Falla si ya está tomado (índice único). */
  reserveTicket(raffleId: string, number: number, player: Ticket["player"]): Promise<Ticket | null>;
  /**
   * Suma un abono sin pasarse del valor del número. Marca `paidInFullAt` al completar.
   * Devuelve null si el abono excede el saldo o el número no existe.
   */
  addPayment(raffleId: string, ticketId: string, payment: Payment, price: number): Promise<Ticket | null>;
  releaseTicket(raffleId: string, ticketId: string): Promise<void>;
}

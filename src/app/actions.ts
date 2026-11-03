"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { logEvent, notifyAdmin, reservedMessage } from "@/lib/activity";
import { cleanPhone, holdHoursOf, isBlocked } from "@/lib/hold";
import { getRepo } from "@/lib/repo";
import { colombiaDate, formatNumber } from "@/lib/raffle";

export interface Result {
  ok: boolean;
  message: string;
}

export async function reserveNumber(input: { slug: string; number: number; name: string; phone: string }): Promise<Result & { label?: string; holdHours?: number }> {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60);
  const phone = cleanPhone(input.phone);
  if (name.length < 2) return { ok: false, message: "Escribe tu nombre." };
  if (phone.length !== 10) return { ok: false, message: "Escribe tu WhatsApp de 10 dígitos." };

  const repo = getRepo();
  const raffle = await repo.getRaffle({ slug: input.slug });
  if (!raffle || raffle.status !== "active") return { ok: false, message: "Esta rifa no está recibiendo jugadores." };
  if (colombiaDate(new Date().toISOString()) > raffle.paymentDeadline) return { ok: false, message: "Ya cerró la venta de números." };
  if (!Number.isInteger(input.number) || input.number < 0 || input.number >= raffle.numberCount) return { ok: false, message: "Número inválido." };

  // Mensaje neutro: no le decimos a quien sabotea que está bloqueado.
  if (isBlocked(raffle, phone)) return { ok: false, message: "No pudimos apartar el número. Escríbele a quien organiza la rifa." };

  const unpaid = (await repo.findTicketsByPhone(raffle.id, phone)).filter((t) => t.paidAmount === 0);
  if (unpaid.length >= 5)
    return { ok: false, message: "Ya tienes 5 números apartados sin abono. Abona alguno para apartar más." };

  const ticket = await repo.reserveTicket(raffle.id, input.number, { name, phone }, { source: "online" });
  if (!ticket) return { ok: false, message: "Alguien lo apartó hace un momento. Elige otro." };
  const hold = holdHoursOf(raffle);
  await logEvent(repo, { raffleId: raffle.id, type: "reserved", by: "player", number: input.number, name, phone });
  const h = await headers();
  const panelUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/admin/rifas/${raffle.id}#numeros`;
  await notifyAdmin(repo, reservedMessage(raffle, input.number, name, phone, hold, panelUrl));
  revalidatePath(`/rifa/${raffle.slug}`);
  revalidatePath(`/admin/rifas/${raffle.id}`);
  return { ok: true, message: "¡Número apartado!", label: formatNumber(input.number, raffle.numberCount), holdHours: hold };
}

export interface MyTicket {
  label: string;
  paidAmount: number;
  price: number;
  paidInFullAt: string | null;
  payments: { amount: number; at: string }[];
}

/** El jugador consulta sus números con su WhatsApp. */
export async function myNumbers(input: { slug: string; phone: string }): Promise<Result & { tickets?: MyTicket[] }> {
  const phone = cleanPhone(input.phone);
  if (phone.length !== 10) return { ok: false, message: "Escribe el WhatsApp de 10 dígitos con el que apartaste." };
  const repo = getRepo();
  const raffle = await repo.getRaffle({ slug: input.slug });
  if (!raffle) return { ok: false, message: "Rifa no encontrada." };
  const tickets = await repo.findTicketsByPhone(raffle.id, phone);
  if (tickets.length === 0) return { ok: false, message: "No encontramos números con ese WhatsApp." };
  return {
    ok: true,
    message: "",
    tickets: tickets.map((t) => ({
      label: formatNumber(t.number, raffle.numberCount),
      paidAmount: t.paidAmount,
      price: raffle.price,
      paidInFullAt: t.paidInFullAt,
      payments: t.payments.map((p) => ({ amount: p.amount, at: p.at })),
    })),
  };
}

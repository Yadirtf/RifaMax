"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { players, tickets } from "@/db/schema";
import { getRaffleBySlug } from "@/lib/data";
import { colombiaDate, formatNumber } from "@/lib/raffle";

export interface ReserveState {
  ok: boolean;
  message: string;
  number?: string;
}

export async function reserveNumber(_prev: ReserveState | null, form: FormData): Promise<ReserveState> {
  const slug = String(form.get("slug") ?? "");
  const number = Number(form.get("number"));
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").replace(/\D/g, "");

  if (name.length < 2) return { ok: false, message: "Escribe tu nombre." };
  if (phone.length < 10) return { ok: false, message: "Escribe un WhatsApp válido (10 dígitos)." };

  const b = await getRaffleBySlug(slug);
  if (!b || b.raffle.status !== "active") return { ok: false, message: "Esta rifa no está recibiendo jugadores." };
  if (colombiaDate(new Date().toISOString()) > b.raffle.paymentDeadline)
    return { ok: false, message: "Ya cerró la venta de números." };
  if (!Number.isInteger(number) || number < 0 || number >= b.raffle.numberCount)
    return { ok: false, message: "Número inválido." };
  if (b.tickets.some((t) => t.number === number)) return { ok: false, message: "Ese número ya lo apartaron. Elige otro." };

  try {
    await db.transaction(async (tx) => {
      const [player] = await tx.insert(players).values({ name, phone }).returning();
      await tx.insert(tickets).values({ raffleId: b.raffle.id, number, playerId: player.id });
    });
  } catch {
    return { ok: false, message: "Ese número ya lo apartaron. Elige otro." };
  }

  revalidatePath(`/rifa/${slug}`);
  return { ok: true, message: "¡Número apartado!", number: formatNumber(number, b.raffle.numberCount) };
}

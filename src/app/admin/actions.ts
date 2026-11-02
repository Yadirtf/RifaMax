"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { payments, players, prizes, raffles, tickets } from "@/db/schema";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { getRaffleById, type RaffleBundle } from "@/lib/data";
import { computeReverse, prepareRoulette, recordLottery, resetDraw, spinRoulette } from "@/lib/draws";
import { themes } from "@/lib/themes";

export interface ActionState {
  ok: boolean;
  message: string;
}

const fail = (message: string): ActionState => ({ ok: false, message });

function refresh(b: RaffleBundle) {
  revalidatePath(`/admin/rifas/${b.raffle.id}`);
  revalidatePath(`/rifa/${b.raffle.slug}`);
}

async function load(form: FormData) {
  await requireAdmin();
  const b = await getRaffleById(Number(form.get("raffleId")));
  if (!b) throw new Error("Rifa no encontrada");
  return b;
}

// --- Sesión ----------------------------------------------------------------

export async function login(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  if (!checkPassword(String(form.get("password") ?? ""))) return fail("Clave incorrecta.");
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// --- Números y abonos ------------------------------------------------------

export async function addPayment(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  const b = await load(form);
  const ticket = b.tickets.find((t) => t.id === Number(form.get("ticketId")));
  if (!ticket) return fail("Número no encontrado.");
  const amount = Math.round(Number(form.get("amount")));
  if (!Number.isFinite(amount) || amount <= 0) return fail("Escribe un valor mayor a cero.");
  const pending = b.raffle.price - ticket.paidAmount;
  if (pending <= 0) return fail("Este número ya está pagado.");
  if (amount > pending) return fail(`Solo debe ${pending.toLocaleString("es-CO")}.`);
  if (ticket.paidAmount === 0 && amount < b.raffle.minDeposit && amount < pending)
    return fail(`El primer abono mínimo es ${b.raffle.minDeposit.toLocaleString("es-CO")}.`);

  const newTotal = ticket.paidAmount + amount;
  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      ticketId: ticket.id,
      amount,
      method: String(form.get("method") ?? "nequi"),
      note: String(form.get("note") ?? ""),
    });
    await tx
      .update(tickets)
      .set({
        paidAmount: sql`${tickets.paidAmount} + ${amount}`,
        paidInFullAt: newTotal >= b.raffle.price ? new Date().toISOString() : null,
      })
      .where(eq(tickets.id, ticket.id));
  });
  refresh(b);
  return { ok: true, message: newTotal >= b.raffle.price ? "Abono registrado. ¡Número pagado!" : "Abono registrado." };
}

export async function assignNumber(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  const b = await load(form);
  const number = Number(form.get("number"));
  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").replace(/\D/g, "");
  if (!Number.isInteger(number) || number < 0 || number >= b.raffle.numberCount) return fail("Número inválido.");
  if (b.tickets.some((t) => t.number === number)) return fail("Ese número ya está apartado.");
  if (name.length < 2) return fail("Escribe el nombre.");
  await db.transaction(async (tx) => {
    const [player] = await tx.insert(players).values({ name, phone }).returning();
    await tx.insert(tickets).values({ raffleId: b.raffle.id, number, playerId: player.id });
  });
  refresh(b);
  return { ok: true, message: "Número asignado. Ahora registra su abono." };
}

export async function releaseTicket(form: FormData) {
  const b = await load(form);
  const ticket = b.tickets.find((t) => t.id === Number(form.get("ticketId")));
  if (!ticket) return;
  const won = [...b.draws.values()].some((d) => d.winningNumber === ticket.number && d.status === "done");
  if (won) throw new Error("No se puede liberar un número ganador");
  await db.transaction(async (tx) => {
    await tx.delete(payments).where(eq(payments.ticketId, ticket.id));
    await tx.delete(tickets).where(and(eq(tickets.id, ticket.id), eq(tickets.raffleId, b.raffle.id)));
  });
  refresh(b);
}

// --- Rifas -----------------------------------------------------------------

interface PrizeInput {
  title: string;
  description: string;
  kind: "cash" | "item" | "refund";
  value: number;
  method: "lottery" | "roulette" | "reverse";
  lotteryName?: string;
  sourcePosition?: number;
  drawDate: string;
  paidBefore?: string;
  excludePreviousWinners: boolean;
  fallback: "roulette" | "none";
}

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function createRaffle(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = String(form.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const theme = String(form.get("theme") ?? "generico");
  const numberCount = Number(form.get("numberCount"));
  const price = Number(form.get("price"));
  const minDeposit = Number(form.get("minDeposit"));
  const paymentDeadline = String(form.get("paymentDeadline") ?? "");
  const drawDate = String(form.get("drawDate") ?? "");

  if (name.length < 3) return fail("Escribe el nombre de la rifa.");
  if (!slug) return fail("Escribe el enlace (slug) de la rifa.");
  if (!themes[theme]) return fail("Tema inválido.");
  if (![10, 100, 1000].includes(numberCount)) return fail("La cantidad de números debe ser 10, 100 o 1000.");
  if (!(price > 0)) return fail("El valor del número debe ser mayor a cero.");
  if (!(minDeposit > 0 && minDeposit <= price)) return fail("El abono mínimo debe estar entre 1 y el valor del número.");
  if (!isDate(paymentDeadline) || !isDate(drawDate)) return fail("Revisa las fechas.");

  let prizeList: PrizeInput[];
  try {
    prizeList = JSON.parse(String(form.get("prizes") ?? "[]"));
  } catch {
    return fail("Premios inválidos.");
  }
  if (prizeList.length === 0) return fail("Agrega al menos un premio.");
  for (const [i, p] of prizeList.entries()) {
    const n = i + 1;
    if (!p.title?.trim()) return fail(`Premio ${n}: falta el nombre.`);
    if (!(p.value >= 0)) return fail(`Premio ${n}: valor inválido.`);
    if (!["lottery", "roulette", "reverse"].includes(p.method)) return fail(`Premio ${n}: método inválido.`);
    if (!["cash", "item", "refund"].includes(p.kind)) return fail(`Premio ${n}: tipo inválido.`);
    if (!isDate(p.drawDate)) return fail(`Premio ${n}: fecha inválida.`);
    if (p.paidBefore && !isDate(p.paidBefore)) return fail(`Premio ${n}: fecha de pago inválida.`);
    if (p.method === "reverse") {
      const src = prizeList[(p.sourcePosition ?? 0) - 1];
      if (!src || src.method !== "lottery") return fail(`Premio ${n}: el número invertido debe salir de un premio por lotería.`);
    }
  }

  const exists = await db.select({ id: raffles.id }).from(raffles).where(eq(raffles.slug, slug));
  if (exists.length > 0) return fail("Ya existe una rifa con ese enlace.");

  const id = await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(raffles)
      .values({
        slug,
        name,
        theme,
        numberCount,
        price,
        minDeposit,
        paymentDeadline,
        drawDate,
        description: String(form.get("description") ?? ""),
        paymentInfo: String(form.get("paymentInfo") ?? ""),
        organizerPhone: String(form.get("organizerPhone") ?? "").replace(/\D/g, ""),
        status: "active",
      })
      .returning();
    await tx.insert(prizes).values(
      prizeList.map((p, i) => ({
        raffleId: r.id,
        position: i + 1,
        title: p.title.trim(),
        description: p.description?.trim() ?? "",
        kind: p.kind,
        value: Math.round(p.value),
        method: p.method,
        lotteryName: p.method === "lottery" ? p.lotteryName?.trim() || "Lotería" : null,
        sourcePosition: p.method === "reverse" ? p.sourcePosition : null,
        drawDate: p.drawDate,
        paidBefore: p.paidBefore || null,
        excludePreviousWinners: !!p.excludePreviousWinners,
        fallback: p.fallback === "none" ? ("none" as const) : ("roulette" as const),
      })),
    );
    return r.id;
  });
  redirect(`/admin/rifas/${id}`);
}

export async function setRaffleStatus(form: FormData) {
  const b = await load(form);
  const status = String(form.get("status"));
  if (!["draft", "active", "closed", "finished"].includes(status)) return;
  await db
    .update(raffles)
    .set({ status: status as "draft" | "active" | "closed" | "finished" })
    .where(eq(raffles.id, b.raffle.id));
  refresh(b);
  revalidatePath("/");
}

// --- Sorteos ---------------------------------------------------------------

function prizeOf(b: RaffleBundle, form: FormData) {
  const prize = b.prizes.find((p) => p.id === Number(form.get("prizeId")));
  if (!prize) throw new Error("Premio no encontrado");
  return prize;
}

export async function recordLotteryAction(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  const b = await load(form);
  try {
    await recordLottery(b, prizeOf(b, form), String(form.get("result") ?? ""));
  } catch (e) {
    return fail((e as Error).message);
  }
  refresh(b);
  return { ok: true, message: "Resultado registrado." };
}

export async function computeReverseAction(form: FormData) {
  const b = await load(form);
  await computeReverse(b, prizeOf(b, form));
  refresh(b);
}

export async function prepareRouletteAction(form: FormData) {
  const b = await load(form);
  await prepareRoulette(prizeOf(b, form));
  refresh(b);
}

export interface SpinResult {
  ok: boolean;
  message: string;
  eligible?: number[];
  index?: number;
  number?: number;
}

export async function spinRouletteAction(form: FormData): Promise<SpinResult> {
  const b = await load(form);
  try {
    const r = await spinRoulette(b, prizeOf(b, form));
    refresh(b);
    if (!r) return { ok: false, message: "No hay números elegibles. Premio desierto." };
    return { ok: true, message: "¡Tenemos ganador!", ...r };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function resetDrawAction(form: FormData) {
  const b = await load(form);
  const prize = prizeOf(b, form);
  const draw = b.draws.get(prize.id);
  // Una ruleta ya girada no se puede repetir: eso permitiría escoger ganador.
  if (draw?.status === "done" && draw.eligible) throw new Error("Una ruleta girada no se puede repetir");
  await resetDraw(prize.id);
  refresh(b);
}

export async function updateRaffleInfo(_prev: ActionState | null, form: FormData): Promise<ActionState> {
  const b = await load(form);
  await db
    .update(raffles)
    .set({
      description: String(form.get("description") ?? "").trim(),
      paymentInfo: String(form.get("paymentInfo") ?? "").trim(),
      organizerPhone: String(form.get("organizerPhone") ?? "").replace(/\D/g, ""),
    })
    .where(eq(raffles.id, b.raffle.id));
  refresh(b);
  return { ok: true, message: "Datos guardados." };
}

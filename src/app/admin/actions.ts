"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { logEvent } from "@/lib/activity";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { cleanPhone } from "@/lib/hold";
import { addChat, botUsername, findChatsByCodes, freshInvites, MAX_TELEGRAM_CHATS, readChats, sendTelegram, TELEGRAM_PENDING, TELEGRAM_SETTING, telegramToken, type TelegramChat } from "@/lib/telegram";
import { getBundle, type RaffleBundle } from "@/lib/data";
import { applyLottery, applyReverse, resetDraw, scheduleRoulette } from "@/lib/draws";
import { fetchOfficialResult, LOTTERIES, lotteryInfo, type OfficialResult } from "@/lib/lotteries";
import { getRepo } from "@/lib/repo";
import type { RaffleInfoPatch } from "@/lib/repo/types";
import { themes } from "@/lib/themes";
import type { NewRaffle, Prize, RaffleStatus } from "@/lib/types";

export interface Result {
  ok: boolean;
  message: string;
}

const fail = (message: string): Result => ({ ok: false, message });
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Algo salió mal.");

function refresh(b: RaffleBundle) {
  revalidatePath(`/admin/rifas/${b.raffle.id}`);
  revalidatePath(`/rifa/${b.raffle.slug}`);
  revalidatePath("/");
}

async function load(raffleId: string) {
  await requireAdmin();
  const b = await getBundle({ id: raffleId });
  if (!b) throw new Error("Rifa no encontrada");
  return b;
}

function prizeOf(b: RaffleBundle, prizeId: string): Prize {
  const p = b.raffle.prizes.find((x) => x.id === prizeId);
  if (!p) throw new Error("Premio no encontrado");
  return p;
}

/** Envuelve una acción: valida sesión, captura errores y refresca las páginas. */
async function run(raffleId: string, fn: (b: RaffleBundle) => Promise<string | Result>): Promise<Result> {
  try {
    const b = await load(raffleId);
    const out = await fn(b);
    refresh(b);
    return typeof out === "string" ? { ok: true, message: out } : out;
  } catch (e) {
    return fail(errMsg(e));
  }
}

// --- Sesión ----------------------------------------------------------------

export async function login(_prev: Result | null, form: FormData): Promise<Result> {
  if (!checkPassword(String(form.get("password") ?? ""))) return fail("Clave incorrecta.");
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// --- Números y abonos ------------------------------------------------------

export async function addPayment(input: { raffleId: string; ticketId: string; amount: number; method: string; note?: string }) {
  return run(input.raffleId, async ({ raffle, tickets }) => {
    const t = tickets.find((x) => x.id === input.ticketId);
    if (!t) return fail("Número no encontrado.");
    const amount = Math.round(input.amount);
    const pending = raffle.price - t.paidAmount;
    if (!(amount > 0)) return fail("Escribe un valor mayor a cero.");
    if (pending <= 0) return fail("Este número ya está pagado.");
    if (amount > pending) return fail(`Solo debe ${pending.toLocaleString("es-CO")}.`);
    if (t.paidAmount === 0 && amount < raffle.minDeposit && amount < pending)
      return fail(`El primer abono mínimo es ${raffle.minDeposit.toLocaleString("es-CO")}.`);
    const updated = await getRepo().addPayment(
      raffle.id,
      t.id,
      { amount, method: input.method.slice(0, 20), note: (input.note ?? "").slice(0, 120), at: new Date().toISOString() },
      raffle.price,
    );
    if (!updated) return fail("No se pudo registrar: el saldo cambió. Recarga la página.");
    await logEvent(getRepo(), { raffleId: raffle.id, type: "payment", by: "admin", number: t.number, name: t.player.name, amount, note: input.method.slice(0, 20) });
    return updated.paidAmount >= raffle.price ? "¡Número pagado completo!" : "Abono registrado.";
  });
}

export async function assignNumber(input: { raffleId: string; number: number; name: string; phone: string }) {
  return run(input.raffleId, async ({ raffle }) => {
    const name = input.name.trim().slice(0, 60);
    const phone = cleanPhone(input.phone);
    if (name.length < 2) return fail("Escribe el nombre.");
    if (!Number.isInteger(input.number) || input.number < 0 || input.number >= raffle.numberCount) return fail("Número inválido.");
    // Lo asigna quien organiza: queda fijado desde el inicio.
    const t = await getRepo().reserveTicket(raffle.id, input.number, { name, phone }, { source: "admin", confirmedAt: new Date().toISOString() });
    if (!t) return fail("Ese número ya está apartado.");
    await logEvent(getRepo(), { raffleId: raffle.id, type: "assigned", by: "admin", number: t.number, name, phone });
    return "Número asignado. Registra su abono.";
  });
}

export async function releaseTicket(input: { raffleId: string; ticketId: string; block?: boolean }) {
  return run(input.raffleId, async ({ raffle, tickets }) => {
    const t = tickets.find((x) => x.id === input.ticketId);
    if (!t) return fail("Número no encontrado.");
    if (raffle.prizes.some((p) => p.draw?.winningNumber === t.number && p.draw.status === "done"))
      return fail("No se puede liberar un número ganador.");
    if (raffle.prizes.some((p) => p.draw?.roulette?.eligible.includes(t.number) && p.draw.status === "scheduled"))
      return fail("Este número está en una ruleta programada.");
    await getRepo().releaseTicket(raffle.id, t.id);
    await logEvent(getRepo(), { raffleId: raffle.id, type: "released", by: "admin", number: t.number, name: t.player.name, phone: t.player.phone, amount: t.paidAmount || undefined });
    if (input.block && t.player.phone) {
      const blocked = [...new Set([...(raffle.blockedPhones ?? []), t.player.phone])];
      await getRepo().updateRaffle(raffle.id, { blockedPhones: blocked });
      await logEvent(getRepo(), { raffleId: raffle.id, type: "blocked", by: "admin", name: t.player.name, phone: t.player.phone });
      return `Número liberado y ${t.player.phone} bloqueado.`;
    }
    return "Número liberado.";
  });
}

/** Fija a un jugador de confianza (su apartado no vence) o le quita el fijado. */
export async function setConfirmed(input: { raffleId: string; ticketId: string; confirmed: boolean }) {
  return run(input.raffleId, async ({ raffle, tickets }) => {
    const t = tickets.find((x) => x.id === input.ticketId);
    if (!t) return fail("Ese número ya no está apartado.");
    const updated = await getRepo().setConfirmed(raffle.id, t.id, input.confirmed ? new Date().toISOString() : null);
    if (!updated) return fail("No se pudo actualizar. Recarga la página.");
    await logEvent(getRepo(), { raffleId: raffle.id, type: input.confirmed ? "confirmed" : "unconfirmed", by: "admin", number: t.number, name: t.player.name });
    return input.confirmed ? `${t.player.name.split(" ")[0]} quedó fijo.` : "Se quitó el fijado.";
  });
}

export async function unblockPhone(input: { raffleId: string; phone: string }) {
  return run(input.raffleId, async ({ raffle }) => {
    await getRepo().updateRaffle(raffle.id, { blockedPhones: (raffle.blockedPhones ?? []).filter((p) => p !== input.phone) });
    await logEvent(getRepo(), { raffleId: raffle.id, type: "unblocked", by: "admin", phone: input.phone });
    return `${input.phone} ya puede apartar.`;
  });
}

// --- Avisos por Telegram ---------------------------------------------------

export interface TelegramStatus {
  configured: boolean;
  chats: TelegramChat[];
  pending: number;
}

const loadChats = async () => readChats(await getRepo().getSetting<unknown>(TELEGRAM_SETTING).catch(() => null));

export async function telegramStatus(): Promise<TelegramStatus> {
  await requireAdmin();
  return { configured: !!telegramToken(), chats: await loadChats(), pending: (await loadInvites()).length };
}

const loadInvites = async () => freshInvites(await getRepo().getSetting<unknown>(TELEGRAM_PENDING).catch(() => null));

/** Paso 1: enlace al bot con un código de un solo uso. Sirve para ti o para enviárselo a otra persona. */
export async function telegramConnectStart(): Promise<Result & { link?: string; code?: string }> {
  await requireAdmin();
  try {
    if ((await loadChats()).length >= MAX_TELEGRAM_CHATS) return fail(`Ya hay ${MAX_TELEGRAM_CHATS} personas conectadas. Quita una para agregar otra.`);
    const code = randomBytes(6).toString("hex");
    const user = await botUsername();
    // Se guarda en la base: si recargas el panel o cierras el aviso, la invitación sigue sirviendo.
    await getRepo().setSetting(TELEGRAM_PENDING, freshInvites([...(await loadInvites()), { code, at: new Date().toISOString() }]));
    return { ok: true, message: "", link: `https://t.me/${user}?start=${code}`, code };
  } catch (e) {
    return fail(errMsg(e));
  }
}

/**
 * Paso 2: busca a quienes ya tocaron "Iniciar" con cualquier invitación pendiente y los agrega.
 * `quiet` sirve para la revisión automática: no se queja si aún no hay nadie.
 */
export async function telegramConnectFinish(input?: { quiet?: boolean }): Promise<Result & { added?: number }> {
  await requireAdmin();
  try {
    const invites = await loadInvites();
    if (!invites.length) return input?.quiet ? { ok: false, message: "" } : fail("No hay invitaciones pendientes. Toca «Agregar» para crear una.");
    const found = await findChatsByCodes(invites.map((i) => i.code));
    if (!found.length) return input?.quiet ? { ok: false, message: "" } : fail("Aún no vemos el mensaje. En Telegram debe tocar Iniciar (o enviar el enlace otra vez) y vuelve a intentarlo.");
    let chats = await loadChats();
    const added: TelegramChat[] = [];
    for (const { chat } of found) {
      const isNew = !chats.some((c) => c.chatId === chat.chatId);
      if (isNew && chats.length >= MAX_TELEGRAM_CHATS) continue;
      chats = addChat(chats, chat);
      if (isNew) added.push(chat);
    }
    const used = new Set(found.map((f) => f.code));
    await getRepo().setSetting(TELEGRAM_SETTING, chats);
    await getRepo().setSetting(TELEGRAM_PENDING, invites.filter((i) => !used.has(i.code)));
    await Promise.all(added.map((c) => sendTelegram(c.chatId, "✅ Listo. Aquí te avisaremos cuando alguien aparte un número.")));
    const names = (added.length ? added : found.map((f) => f.chat)).map((c) => c.name).join(", ");
    return { ok: true, message: added.length ? `Conectado con ${names}.` : `${names} ya estaba conectado.`, added: added.length };
  } catch (e) {
    return input?.quiet ? { ok: false, message: "" } : fail(errMsg(e));
  }
}

export async function telegramTest(): Promise<Result> {
  await requireAdmin();
  const chats = await loadChats();
  if (!chats.length) return fail("Primero conecta Telegram.");
  const sent = await Promise.all(chats.map((c) => sendTelegram(c.chatId, "🔔 Prueba de RifaMax: los avisos funcionan.")));
  const ok = sent.filter(Boolean).length;
  if (!ok) return fail("Telegram no respondió. Revisa el token.");
  if (ok < chats.length) return fail(`Llegó a ${ok} de ${chats.length}. Quien no lo recibió debe abrir el bot y tocar Iniciar otra vez.`);
  return { ok: true, message: chats.length > 1 ? `Enviamos la prueba a las ${chats.length} personas.` : "Te enviamos un mensaje de prueba." };
}

/** Quita a una persona de los avisos (o a todas si no se indica). */
export async function telegramDisconnect(input?: { chatId?: number }): Promise<Result> {
  await requireAdmin();
  const chats = await loadChats();
  const rest = typeof input?.chatId === "number" ? chats.filter((c) => c.chatId !== input.chatId) : [];
  await getRepo().setSetting(TELEGRAM_SETTING, rest.length ? rest : null);
  return { ok: true, message: rest.length ? "Ya no le llegarán avisos a esa persona." : "Avisos desactivados." };
}

// --- Rifas -----------------------------------------------------------------

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export interface PrizeInput {
  title: string;
  description: string;
  kind: Prize["kind"];
  value: number;
  method: Prize["method"];
  lotteryKey?: string;
  sourcePosition?: number;
  drawDate: string;
  paidBefore?: string;
  excludePreviousWinners: boolean;
  fallback: Prize["fallback"];
}

export interface RaffleInput {
  name: string;
  slug: string;
  theme: string;
  description: string;
  numberCount: number;
  price: number;
  minDeposit: number;
  paymentDeadline: string;
  drawDate: string;
  paymentInfo: string;
  organizerPhone: string;
  goal?: number;
  prizes: PrizeInput[];
}

export async function createRaffle(input: RaffleInput): Promise<Result & { id?: string }> {
  await requireAdmin();
  const slug = input.slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (input.name.trim().length < 3) return fail("Escribe el nombre de la rifa.");
  if (!slug) return fail("Escribe el enlace de la rifa.");
  if (!themes[input.theme]) return fail("Elige un tema.");
  if (![10, 100, 1000].includes(input.numberCount)) return fail("La cantidad de números debe ser 10, 100 o 1000.");
  if (!(input.price > 0)) return fail("El valor del número debe ser mayor a cero.");
  if (!(input.minDeposit > 0 && input.minDeposit <= input.price)) return fail("El abono mínimo debe estar entre 1 y el valor del número.");
  if (!isDate(input.paymentDeadline) || !isDate(input.drawDate)) return fail("Revisa las fechas.");
  if (input.paymentDeadline > input.drawDate) return fail("El cierre de pagos debe ser antes del sorteo.");
  if (input.prizes.length === 0) return fail("Agrega al menos un premio.");

  const prizes: Prize[] = [];
  for (const [i, p] of input.prizes.entries()) {
    const n = i + 1;
    if (!p.title?.trim()) return fail(`Premio ${n}: falta el nombre.`);
    if (!(p.value >= 0)) return fail(`Premio ${n}: valor inválido.`);
    if (!["lottery", "roulette", "reverse"].includes(p.method)) return fail(`Premio ${n}: forma de ganar inválida.`);
    if (!["cash", "item", "refund"].includes(p.kind)) return fail(`Premio ${n}: tipo inválido.`);
    if (!isDate(p.drawDate)) return fail(`Premio ${n}: fecha inválida.`);
    if (p.paidBefore && !isDate(p.paidBefore)) return fail(`Premio ${n}: fecha de pago inválida.`);
    if (p.method === "lottery" && !LOTTERIES[p.lotteryKey ?? ""]) return fail(`Premio ${n}: elige la lotería.`);
    if (p.method === "reverse") {
      const src = input.prizes[(p.sourcePosition ?? 0) - 1];
      if (!src || src.method !== "lottery") return fail(`Premio ${n}: el número al revés debe salir de un premio por lotería.`);
    }
    prizes.push({
      id: `p${n}`,
      position: n,
      title: p.title.trim(),
      description: p.description?.trim() ?? "",
      kind: p.kind,
      value: Math.round(p.value),
      method: p.method,
      ...(p.method === "lottery" ? { lotteryKey: p.lotteryKey } : {}),
      ...(p.method === "reverse" ? { sourcePosition: p.sourcePosition } : {}),
      drawDate: p.drawDate,
      ...(p.paidBefore ? { paidBefore: p.paidBefore } : {}),
      excludePreviousWinners: !!p.excludePreviousWinners,
      fallback: p.fallback === "none" ? "none" : "roulette",
    });
  }

  const raffle: NewRaffle = {
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    theme: input.theme,
    numberCount: input.numberCount,
    price: Math.round(input.price),
    minDeposit: Math.round(input.minDeposit),
    paymentDeadline: input.paymentDeadline,
    drawDate: input.drawDate,
    paymentInfo: input.paymentInfo.trim(),
    organizerPhone: input.organizerPhone.replace(/\D/g, ""),
    ...(input.goal && input.goal > 0 ? { goal: Math.round(input.goal) } : {}),
    status: "active",
    prizes,
  };
  const res = await getRepo().createRaffle(raffle);
  if (!res.ok) return fail("Ya existe una rifa con ese enlace.");
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Rifa creada.", id: res.id };
}

export async function updateRaffleInfo(input: { raffleId: string; patch: RaffleInfoPatch }) {
  return run(input.raffleId, async ({ raffle }) => {
    const p = input.patch;
    const patch: RaffleInfoPatch = {};
    if (p.name !== undefined) patch.name = p.name.trim().slice(0, 80) || raffle.name;
    if (p.description !== undefined) patch.description = p.description.trim().slice(0, 400);
    if (p.paymentInfo !== undefined) patch.paymentInfo = p.paymentInfo.trim().slice(0, 300);
    if (p.organizerPhone !== undefined) patch.organizerPhone = p.organizerPhone.replace(/\D/g, "").slice(0, 13);
    if (p.goal !== undefined) patch.goal = Math.max(0, Math.round(Number(p.goal) || 0));
    if (p.holdHours !== undefined) patch.holdHours = Math.min(24 * 30, Math.max(0, Math.round(Number(p.holdHours) || 0)));
    if (p.theme !== undefined && themes[p.theme]) patch.theme = p.theme;
    if (p.status !== undefined && (["draft", "active", "closed", "finished"] as RaffleStatus[]).includes(p.status)) patch.status = p.status;
    await getRepo().updateRaffle(raffle.id, patch);
    return "Cambios guardados.";
  });
}

// --- Sorteos ---------------------------------------------------------------

export async function lookupOfficialLottery(input: { raffleId: string; prizeId: string }): Promise<Result & { result?: OfficialResult }> {
  try {
    const b = await load(input.raffleId);
    const prize = prizeOf(b, input.prizeId);
    const res = await fetchOfficialResult(prize.lotteryKey ?? "medellin", prize.drawDate);
    return res.ok ? { ok: true, message: "Resultado oficial encontrado.", result: res.result } : { ok: false, message: res.message };
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function applyLotteryAction(input: {
  raffleId: string;
  prizeId: string;
  number: string;
  serie?: string;
  drawNumber?: string;
  official: boolean;
}) {
  return run(input.raffleId, async (b) => {
    const prize = prizeOf(b, input.prizeId);
    const key = prize.lotteryKey ?? "medellin";
    const number = input.number.replace(/\D/g, "");
    if (number.length < 2) return fail("Escribe el número ganador completo.");
    let official: OfficialResult | undefined;
    if (input.official) {
      // Se vuelve a consultar en el servidor: el resultado oficial no viaja desde el navegador.
      const res = await fetchOfficialResult(key, prize.drawDate);
      if (!res.ok) return fail(res.message);
      official = res.result;
      if (official.number !== number) return fail("El resultado oficial cambió. Vuelve a consultarlo.");
    }
    await applyLottery(b.raffle, b.tickets, prize, {
      lotteryKey: key,
      number,
      serie: (official?.serie ?? input.serie)?.replace(/\D/g, "") || undefined,
      drawNumber: (official?.drawNumber ?? input.drawNumber)?.replace(/\D/g, "") || undefined,
      date: official?.date ?? prize.drawDate,
      source: official ? "official" : "manual",
      url: lotteryInfo(key).resultsUrl,
    });
    return "Resultado aplicado.";
  });
}

export async function applyReverseAction(input: { raffleId: string; prizeId: string }) {
  return run(input.raffleId, async (b) => {
    await applyReverse(b.raffle, b.tickets, prizeOf(b, input.prizeId));
    return "Número al revés calculado.";
  });
}

export async function scheduleRouletteAction(input: { raffleId: string; prizeId: string; at: string }) {
  return run(input.raffleId, async (b) => {
    const at = new Date(input.at);
    if (Number.isNaN(at.getTime())) return fail("Hora inválida.");
    if (at.getTime() > Date.now() + 1000 * 60 * 60 * 24 * 60) return fail("Programa la ruleta dentro de los próximos 60 días.");
    await scheduleRoulette(b.raffle, b.tickets, prizeOf(b, input.prizeId), at);
    return "Ruleta programada. Los elegibles y la ronda quedaron fijos.";
  });
}

export async function resetDrawAction(input: { raffleId: string; prizeId: string }) {
  return run(input.raffleId, async (b) => {
    await resetDraw(b.raffle, prizeOf(b, input.prizeId));
    return "Sorteo deshecho.";
  });
}

/** Revisa si ya salió la ronda de una ruleta (el panel lo llama al terminar la cuenta regresiva). */
export async function refreshDraws(input: { raffleId: string }) {
  return run(input.raffleId, async () => "ok");
}

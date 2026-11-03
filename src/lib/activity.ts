import "server-only";
import { formatNumber } from "./raffle";
import type { Repo } from "./repo/types";
import { escapeHtml, readChats, sendTelegram, TELEGRAM_SETTING, telegramToken } from "./telegram";
import type { Raffle, RaffleEvent } from "./types";

/** Guarda el evento en el historial. Si falla, no interrumpe la acción. */
export async function logEvent(repo: Repo, e: Omit<RaffleEvent, "id" | "at"> & { at?: string }) {
  try {
    await repo.addEvent({ ...e, at: e.at ?? new Date().toISOString() });
  } catch (err) {
    console.warn("[rifamax] No se pudo guardar el evento:", err);
  }
}

/** Aviso a Telegram a todas las personas conectadas. */
export async function notifyAdmin(repo: Repo, text: string): Promise<boolean> {
  if (!telegramToken()) return false;
  const chats = readChats(await repo.getSetting<unknown>(TELEGRAM_SETTING).catch(() => null));
  if (!chats.length) return false;
  const sent = await Promise.all(chats.map((c) => sendTelegram(c.chatId, text)));
  return sent.some(Boolean);
}

export function reservedMessage(raffle: Raffle, number: number, name: string, phone: string, holdHours: number, panelUrl: string) {
  const n = formatNumber(number, raffle.numberCount);
  const lines = [
    `🎟️ <b>Nuevo apartado: ${n}</b>`,
    `${escapeHtml(name)} · ${phone}`,
    escapeHtml(raffle.name),
    holdHours > 0 ? `Si no abona ni lo fijas, se libera en ${holdHours} h.` : "",
    `<a href="${panelUrl}">Abrir panel</a>`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function expiredMessage(raffle: Raffle, items: { number: number; name: string }[]) {
  const list = items.map((i) => `${formatNumber(i.number, raffle.numberCount)} (${escapeHtml(i.name)})`).join(", ");
  return `⏰ <b>Apartados vencidos</b> en ${escapeHtml(raffle.name)}: ${list}. Ya están libres otra vez.`;
}


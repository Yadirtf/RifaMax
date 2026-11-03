/**
 * Avisos por Telegram al celular de quien organiza.
 * Requiere TELEGRAM_BOT_TOKEN (de @BotFather). Cada persona se conecta desde el panel (hasta 5) y se guarda en la base.
 */

// TELEGRAM_API_URL solo sirve para pruebas locales con un servidor falso.
const API = process.env.TELEGRAM_API_URL || "https://api.telegram.org";

export const telegramToken = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "";

export interface TelegramChat {
  chatId: number;
  name: string;
}

export const TELEGRAM_SETTING = "telegram";
export const MAX_TELEGRAM_CHATS = 5;

const isChat = (v: unknown): v is TelegramChat => !!v && typeof (v as TelegramChat).chatId === "number";

/** Lee las personas conectadas. Acepta el formato anterior (una sola persona). */
export function readChats(v: unknown): TelegramChat[] {
  if (Array.isArray(v)) return v.filter(isChat);
  return isChat(v) ? [v] : [];
}

/** Agrega una persona; si ya estaba, actualiza su nombre. */
export function addChat(list: TelegramChat[], chat: TelegramChat): TelegramChat[] {
  return list.some((c) => c.chatId === chat.chatId) ? list.map((c) => (c.chatId === chat.chatId ? chat : c)) : [...list, chat];
}

async function call<T>(method: string, body: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<T> {
  const token = telegramToken();
  if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN en Vercel.");
  const res = await fetcher(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { ok: boolean; result: T; description?: string } | null;
  if (!json?.ok) throw new Error(json?.description || `Telegram respondió ${res.status}`);
  return json.result;
}

export async function botUsername(fetcher?: typeof fetch): Promise<string> {
  return (await call<{ username: string }>("getMe", {}, fetcher)).username;
}

interface Update {
  update_id: number;
  message?: { text?: string; chat: { id: number; first_name?: string; last_name?: string; title?: string; username?: string } };
}

/** Busca el mensaje "/start <code>" que la persona envió al bot desde el enlace del panel. */
export function findStartChat(updates: Update[], code: string): TelegramChat | null {
  for (const u of [...updates].reverse()) {
    const m = u.message;
    if (m?.text?.trim() === `/start ${code}`) {
      const name = m.chat.title || [m.chat.first_name, m.chat.last_name].filter(Boolean).join(" ") || m.chat.username || "Telegram";
      return { chatId: m.chat.id, name };
    }
  }
  return null;
}

/** Busca, entre los últimos mensajes al bot, a quienes tocaron Iniciar con alguno de los códigos. */
export async function findChatsByCodes(codes: string[], fetcher?: typeof fetch): Promise<{ code: string; chat: TelegramChat }[]> {
  if (!codes.length) return [];
  // offset -100: los 100 mensajes más recientes (sin offset, Telegram devuelve los más viejos).
  const updates = await call<Update[]>("getUpdates", { allowed_updates: ["message"], limit: 100, offset: -100 }, fetcher);
  return codes.flatMap((code) => {
    const chat = findStartChat(updates, code);
    return chat ? [{ code, chat }] : [];
  });
}

/** Invitaciones generadas que aún no se completan. Se guardan para no perderlas si se recarga el panel. */
export interface PendingInvite {
  code: string;
  at: string;
}
export const TELEGRAM_PENDING = "telegram_pending";
const INVITE_TTL_MS = 48 * 3_600_000;

export function freshInvites(v: unknown, now = Date.now()): PendingInvite[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i): i is PendingInvite => !!i && typeof i.code === "string" && typeof i.at === "string")
    .filter((i) => now - new Date(i.at).getTime() < INVITE_TTL_MS)
    .slice(-10);
}

/** Envía un mensaje. Nunca lanza: un aviso fallido no debe dañar el apartado del jugador. */
export async function sendTelegram(chatId: number, text: string, fetcher?: typeof fetch): Promise<boolean> {
  try {
    await call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }, fetcher);
    return true;
  } catch (e) {
    console.warn("[rifamax] Telegram:", e instanceof Error ? e.message : e);
    return false;
  }
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

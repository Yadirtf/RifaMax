/**
 * Avisos por Telegram al celular de quien organiza.
 * Requiere TELEGRAM_BOT_TOKEN (de @BotFather). El chat se conecta desde el panel y se guarda en la base.
 */

const API = "https://api.telegram.org";

export const telegramToken = () => process.env.TELEGRAM_BOT_TOKEN?.trim() || "";

export interface TelegramChat {
  chatId: number;
  name: string;
}

export const TELEGRAM_SETTING = "telegram";

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

export async function findChatByCode(code: string, fetcher?: typeof fetch): Promise<TelegramChat | null> {
  const updates = await call<Update[]>("getUpdates", { allowed_updates: ["message"], limit: 100 }, fetcher);
  return findStartChat(updates, code);
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

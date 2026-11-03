import { describe, expect, it } from "vitest";
import { addChat, escapeHtml, findChatsByCodes, findStartChat, freshInvites, readChats } from "./telegram";

describe("conexión con Telegram", () => {
  const updates = [
    { update_id: 1, message: { text: "/start otro", chat: { id: 5, first_name: "Intruso" } } },
    { update_id: 2, message: { text: "/start a1b2c3d4e5f6", chat: { id: 42, first_name: "Yadir", last_name: "T" } } },
    { update_id: 3, message: { text: "hola", chat: { id: 42, first_name: "Yadir" } } },
  ];
  it("encuentra el chat que envió el código del panel", () => {
    expect(findStartChat(updates, "a1b2c3d4e5f6")).toEqual({ chatId: 42, name: "Yadir T" });
    expect(findStartChat(updates, "ffffffffffff")).toBeNull();
  });
  it("escapa el nombre del jugador en el mensaje", () => {
    expect(escapeHtml("<b>Ana & Co</b>")).toBe("&lt;b&gt;Ana &amp; Co&lt;/b&gt;");
  });
  it("guarda varias personas y lee el formato anterior", () => {
    const yadir = { chatId: 42, name: "Yadir" };
    expect(readChats(yadir)).toEqual([yadir]);
    expect(readChats(null)).toEqual([]);
    const two = addChat([yadir], { chatId: 7, name: "Tatiana" });
    expect(two.map((c) => c.chatId)).toEqual([42, 7]);
    expect(addChat(two, { chatId: 42, name: "Yadir T" })).toEqual([{ chatId: 42, name: "Yadir T" }, { chatId: 7, name: "Tatiana" }]);
  });
  it("pide los mensajes más recientes y encuentra varias invitaciones", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:test";
    let body: Record<string, unknown> = {};
    const fetcher = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ ok: true, result: updates }));
    }) as unknown as typeof fetch;
    const found = await findChatsByCodes(["a1b2c3d4e5f6", "ffffffffffff"], fetcher);
    expect(body.offset).toBe(-100);
    expect(found).toEqual([{ code: "a1b2c3d4e5f6", chat: { chatId: 42, name: "Yadir T" } }]);
  });
  it("descarta invitaciones de hace más de 48 horas", () => {
    const now = Date.parse("2026-11-03T12:00:00Z");
    const list = [
      { code: "viejo", at: "2026-11-01T00:00:00Z" },
      { code: "nuevo", at: "2026-11-03T11:00:00Z" },
    ];
    expect(freshInvites(list, now).map((i) => i.code)).toEqual(["nuevo"]);
    expect(freshInvites("basura", now)).toEqual([]);
  });
});

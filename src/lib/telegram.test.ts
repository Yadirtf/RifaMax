import { describe, expect, it } from "vitest";
import { escapeHtml, findStartChat } from "./telegram";

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
});

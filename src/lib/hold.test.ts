import { describe, expect, it } from "vitest";
import { cleanPhone, expiresAt, expiryCutoff, holdHoursOf, isBlocked, isExpired, isUnconfirmed, timeLeft } from "./hold";

const base = { source: "online" as const, confirmedAt: null, paidAmount: 0, createdAt: "2026-11-01T10:00:00.000Z" };

describe("apartados por confirmar", () => {
  it("solo vencen los apartados en línea, sin abono y sin fijar", () => {
    expect(isUnconfirmed(base)).toBe(true);
    expect(isUnconfirmed({ ...base, paidAmount: 5000 })).toBe(false);
    expect(isUnconfirmed({ ...base, confirmedAt: "2026-11-01T11:00:00.000Z" })).toBe(false);
    expect(isUnconfirmed({ ...base, source: "admin" })).toBe(false);
    // Números de antes de esta función (sin source) nunca vencen.
    expect(isUnconfirmed({ ...base, source: undefined })).toBe(false);
  });

  it("usa 48 h por defecto y 0 desactiva el vencimiento", () => {
    expect(holdHoursOf({})).toBe(48);
    expect(expiresAt(base, {})?.toISOString()).toBe("2026-11-03T10:00:00.000Z");
    expect(expiresAt(base, { holdHours: 0 })).toBeNull();
    expect(isExpired(base, { holdHours: 24 }, Date.parse("2026-11-02T10:00:00.000Z"))).toBe(true);
    expect(isExpired(base, { holdHours: 24 }, Date.parse("2026-11-02T09:59:00.000Z"))).toBe(false);
    expect(expiryCutoff({ holdHours: 24 }, Date.parse("2026-11-02T10:00:00.000Z"))).toBe("2026-11-01T10:00:00.000Z");
  });

  it("normaliza y bloquea teléfonos", () => {
    expect(cleanPhone("+57 300 111 2233")).toBe("3001112233");
    expect(isBlocked({ blockedPhones: ["3001112233"] }, "3001112233")).toBe(true);
    expect(isBlocked({}, "3001112233")).toBe(false);
    expect(timeLeft(90 * 60000)).toBe("en 1 h");
    expect(timeLeft(10 * 60000)).toBe("en 10 min");
  });
});

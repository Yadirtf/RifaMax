import { describe, expect, it } from "vitest";
import {
  colombiaDate,
  eligibleNumbers,
  formatNumber,
  generateSeed,
  isEligible,
  lotteryNumber,
  pickWinner,
  reverseNumber,
  sha256Hex,
  ticketState,
  verifyDraw,
} from "./raffle";

describe("números", () => {
  it("formatea con ceros a la izquierda según la cantidad", () => {
    expect(formatNumber(5, 100)).toBe("05");
    expect(formatNumber(5, 1000)).toBe("005");
    expect(formatNumber(5, 10)).toBe("5");
  });

  it("toma las últimas cifras de la lotería", () => {
    expect(lotteryNumber("4837", 100)).toBe(37);
    expect(lotteryNumber("48-07", 100)).toBe(7);
    expect(lotteryNumber("7", 100)).toBeNull();
    expect(lotteryNumber("4875", 50)).toBeNull();
  });

  it("invierte el número", () => {
    expect(reverseNumber(37, 100)).toBe(73);
    expect(reverseNumber(5, 100)).toBe(50);
    expect(reverseNumber(44, 100)).toBe(44);
  });
});

describe("estado y elegibilidad", () => {
  const price = 20000;

  it("calcula el estado del número", () => {
    expect(ticketState(undefined, price)).toBe("free");
    expect(ticketState({ number: 1, paidAmount: 0, paidInFullAt: null }, price)).toBe("reserved");
    expect(ticketState({ number: 1, paidAmount: 5000, paidInFullAt: null }, price)).toBe("partial");
    expect(ticketState({ number: 1, paidAmount: 20000, paidInFullAt: "2026-11-10T15:00:00Z" }, price)).toBe("paid");
  });

  it("usa hora de Colombia para la fecha límite", () => {
    // 15 dic 23:30 en Colombia = 16 dic 04:30 UTC
    expect(colombiaDate("2026-12-16T04:30:00Z")).toBe("2026-12-15");
    const t = { number: 3, paidAmount: price, paidInFullAt: "2026-12-16T04:30:00Z" };
    expect(isEligible(t, price, "2026-12-15")).toBe(true);
    expect(isEligible({ ...t, paidInFullAt: "2026-12-16T05:30:00Z" }, price, "2026-12-15")).toBe(false);
  });

  it("filtra elegibles y excluye ganadores previos", () => {
    const tickets = [
      { number: 9, paidAmount: price, paidInFullAt: "2026-11-20T12:00:00Z" },
      { number: 2, paidAmount: price, paidInFullAt: "2026-11-21T12:00:00Z" },
      { number: 4, paidAmount: 10000, paidInFullAt: null },
      { number: 7, paidAmount: price, paidInFullAt: "2026-12-10T12:00:00Z" },
    ];
    expect(eligibleNumbers(tickets, price, "2026-11-30")).toEqual([2, 9]);
    expect(eligibleNumbers(tickets, price, "2026-12-15", [9])).toEqual([2, 7]);
  });
});

describe("ruleta verificable", () => {
  it("es determinista y verificable", async () => {
    const seed = generateSeed();
    const hash = await sha256Hex(seed);
    const eligible = [42, 3, 17, 88];
    const a = await pickWinner(seed, eligible);
    const b = await pickWinner(seed, [...eligible].reverse());
    expect(a.number).toBe(b.number);
    expect(eligible).toContain(a.number);
    expect(await verifyDraw(seed, hash, eligible, a.number)).toBe(true);
    const other = eligible.find((n) => n !== a.number)!;
    expect(await verifyDraw(seed, hash, eligible, other)).toBe(false);
    expect(await verifyDraw("otra", hash, eligible, a.number)).toBe(false);
  });

  it("reparte de forma aproximadamente uniforme", async () => {
    const eligible = [1, 2, 3, 4];
    const counts = new Map<number, number>();
    for (let i = 0; i < 2000; i++) {
      const { number } = await pickWinner(`s${i}`, eligible);
      counts.set(number, (counts.get(number) ?? 0) + 1);
    }
    for (const n of eligible) {
      expect(counts.get(n)).toBeGreaterThan(400);
      expect(counts.get(n)).toBeLessThan(600);
    }
  });

  it("falla sin elegibles", async () => {
    await expect(pickWinner("x", [])).rejects.toThrow();
  });
});

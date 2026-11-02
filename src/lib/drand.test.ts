import { describe, expect, it } from "vitest";
import { beaconIsConsistent, fetchBeacon, QUICKNET, roundAt, roundTime, simulatedBeacon, winnerFromRandomness } from "./drand";

// Ronda real de quicknet publicada por drand (api.drand.sh), usada como vector de prueba.
const REAL = {
  round: 1000,
  randomness: "fe290beca10872ef2fb164d2aa4442de4566183ec51c56ff3cd603d930e54fdd",
  signature:
    "b44679b9a59af2ec876b1a6b1ad52ea9b1615fc3982b19576350f93447cb1125e342b73a8dd2bacbe47e4b6b63ed5e39",
};

describe("drand quicknet", () => {
  it("convierte entre tiempo y ronda", () => {
    expect(roundAt(QUICKNET.genesisTime * 1000)).toBe(1);
    expect(roundTime(1).getTime()).toBe(QUICKNET.genesisTime * 1000);
    const r = roundAt(Date.parse("2026-12-18T23:00:00Z"));
    expect(roundTime(r).getTime()).toBeGreaterThanOrEqual(Date.parse("2026-12-18T23:00:00Z"));
    expect(roundTime(r).getTime() - Date.parse("2026-12-18T23:00:00Z")).toBeLessThan(3000);
  });

  it("verifica que randomness = SHA-256(firma)", async () => {
    expect(await beaconIsConsistent(REAL)).toBe(true);
    expect(await beaconIsConsistent({ ...REAL, randomness: "00" + REAL.randomness.slice(2) })).toBe(false);
    expect(await beaconIsConsistent(await simulatedBeacon(5))).toBe(true);
  });

  it("elige ganador de forma determinista sobre la lista ordenada", () => {
    const a = winnerFromRandomness(REAL.randomness, [42, 3, 17, 88]);
    const b = winnerFromRandomness(REAL.randomness, [88, 17, 3, 42]);
    expect(a).toEqual(b);
    const expected = Number(BigInt("0x" + REAL.randomness) % 4n);
    expect(a.number).toBe([3, 17, 42, 88][expected]);
    expect(() => winnerFromRandomness(REAL.randomness, [])).toThrow();
  });

  it("descarta respuestas alteradas y prueba otro relay", async () => {
    let calls = 0;
    const fake = (async () => {
      calls++;
      const body = calls === 1 ? { ...REAL, randomness: "ab".repeat(32) } : REAL;
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await fetchBeacon(1000, fake)).toEqual(REAL);
    expect(calls).toBe(2);
  });
});

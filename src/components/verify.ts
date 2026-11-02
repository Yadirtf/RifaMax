"use client";

import { fetchBeacon, roundUrl, simulatedBeacon, winnerFromRandomness } from "@/lib/drand";
import type { RouletteDraw } from "@/lib/types";

export interface VerifyOutcome {
  ok: boolean;
  steps: { label: string; ok: boolean; detail?: string }[];
  url: string;
}

/**
 * Verificación hecha en el navegador del jugador, sin confiar en nuestro servidor:
 * descarga la ronda directamente de drand y recalcula el ganador.
 */
export async function verifyRoulette(r: RouletteDraw, winningNumber: number): Promise<VerifyOutcome> {
  const url = roundUrl(r.round);
  const beacon = r.simulated ? await simulatedBeacon(r.round) : await fetchBeacon(r.round);
  const steps: VerifyOutcome["steps"] = [];
  if (!beacon) {
    steps.push({ label: `Descargar la ronda ${r.round} de drand`, ok: false, detail: "No hubo conexión con drand. Abre el enlace oficial." });
    return { ok: false, steps, url };
  }
  steps.push({ label: `Ronda ${r.round} descargada de drand${r.simulated ? " (simulador de desarrollo)" : ""}`, ok: true });
  const sameRandom = beacon.randomness === r.randomness;
  steps.push({ label: "La aleatoriedad coincide con la publicada aquí", ok: sameRandom, detail: beacon.randomness.slice(0, 16) + "…" });
  const { number, index } = winnerFromRandomness(beacon.randomness, r.eligible);
  steps.push({
    label: `aleatoriedad mod ${r.eligible.length} elegibles = posición ${index + 1}`,
    ok: number === winningNumber,
    detail: `número ${number}`,
  });
  return { ok: steps.every((s) => s.ok), steps, url };
}

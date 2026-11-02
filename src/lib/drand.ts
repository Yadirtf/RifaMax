/**
 * Aleatoriedad pública de drand (League of Entropy): https://drand.love
 *
 * Una red de organizaciones independientes (Cloudflare, Protocol Labs,
 * universidades…) publica cada 3 segundos un número aleatorio firmado que
 * nadie puede predecir ni alterar. La ruleta se compromete ANTES con una
 * ronda futura y con la lista de números elegibles; cuando la ronda sale,
 * el ganador queda determinado y cualquiera puede comprobarlo.
 *
 * Funciona igual en el servidor y en el navegador.
 */
import { sha256Hex } from "./raffle";

export const QUICKNET = {
  chainHash: "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971",
  genesisTime: 1692803367,
  period: 3,
} as const;

export const RELAYS = [
  "https://api.drand.sh",
  "https://api2.drand.sh",
  "https://api3.drand.sh",
  "https://drand.cloudflare.com",
];

/** Primera ronda publicada en o después del instante dado. */
export function roundAt(timeMs: number): number {
  const t = Math.ceil(timeMs / 1000);
  return Math.max(1, Math.ceil((t - QUICKNET.genesisTime) / QUICKNET.period) + 1);
}

export function roundTime(round: number): Date {
  return new Date((QUICKNET.genesisTime + (round - 1) * QUICKNET.period) * 1000);
}

export function roundUrl(round: number, relay = RELAYS[0]): string {
  return `${relay}/${QUICKNET.chainHash}/public/${round}`;
}

export interface Beacon {
  round: number;
  randomness: string;
  signature: string;
}

/** En quicknet, randomness = SHA-256(firma). Comprueba que la ronda sea coherente. */
export async function beaconIsConsistent(b: Beacon): Promise<boolean> {
  const sig = b.signature.match(/../g)?.map((h) => parseInt(h, 16));
  if (!sig) return false;
  const hash = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(sig));
  const hex = Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return hex === b.randomness;
}

/** Simulador determinista para desarrollo sin internet. Nunca en producción. */
export async function simulatedBeacon(round: number): Promise<Beacon> {
  const signature = (await sha256Hex(`rifamax-sim-${round}`)).repeat(2).slice(0, 96);
  const bytes = new Uint8Array(signature.match(/../g)!.map((h) => parseInt(h, 16)));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const randomness = Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return { round, randomness, signature };
}

/** Descarga una ronda probando varios relays. Devuelve null si aún no existe o no hay conexión. */
export async function fetchBeacon(round: number, fetcher: typeof fetch = fetch): Promise<Beacon | null> {
  for (const relay of RELAYS) {
    try {
      const res = await fetcher(roundUrl(round, relay), { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const b = (await res.json()) as Beacon;
      if (b.round === round && (await beaconIsConsistent(b))) return b;
    } catch {
      // probar el siguiente relay
    }
  }
  return null;
}

/**
 * Ganador a partir de la aleatoriedad: índice = randomness (entero de 256 bits)
 * módulo la cantidad de elegibles, sobre la lista ordenada de menor a mayor.
 */
export function winnerFromRandomness(randomness: string, eligible: number[]): { index: number; number: number } {
  if (eligible.length === 0) throw new Error("No hay números elegibles");
  const sorted = [...eligible].sort((a, b) => a - b);
  const index = Number(BigInt(`0x${randomness}`) % BigInt(sorted.length));
  return { index, number: sorted[index] };
}

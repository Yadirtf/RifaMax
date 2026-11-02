/** Modelo de dominio. Lo comparten la base de datos, el servidor y la interfaz. */

export type RaffleStatus = "draft" | "active" | "closed" | "finished";
export type PrizeKind = "cash" | "item" | "refund";
export type PrizeMethod = "lottery" | "roulette" | "reverse";

export interface LotteryResult {
  /** Clave del proveedor (ver src/lib/lotteries.ts). */
  lotteryKey: string;
  /** Número del sorteo oficial, si se conoce. */
  drawNumber?: string;
  /** Fecha del sorteo (YYYY-MM-DD). */
  date?: string;
  /** Número ganador completo tal como se publicó (p. ej. "4837"). */
  number: string;
  serie?: string;
  /** official: consultado en la fuente oficial; manual: digitado por quien organiza. */
  source: "official" | "manual";
  /** Dónde verificarlo. */
  url: string;
}

export interface RouletteDraw {
  /** Red de drand usada (quicknet). */
  chainHash: string;
  /** Ronda futura de drand cuyo valor decide la ruleta. */
  round: number;
  /** Hora (ISO) en que drand publica esa ronda. */
  roundTime: string;
  /** Números elegibles, fijados antes de conocer la aleatoriedad. */
  eligible: number[];
  randomness?: string;
  signature?: string;
  /** true si se usó el simulador local (solo desarrollo). */
  simulated?: boolean;
}

export interface Draw {
  /** scheduled: ruleta programada; done: hay ganador; void: desierto. */
  status: "scheduled" | "done" | "void";
  lottery?: LotteryResult;
  roulette?: RouletteDraw;
  winningNumber?: number;
  note: string;
  doneAt?: string;
}

export interface Prize {
  id: string;
  position: number;
  title: string;
  description: string;
  kind: PrizeKind;
  value: number;
  method: PrizeMethod;
  /** Para method=lottery. */
  lotteryKey?: string;
  /** Para method=reverse: posición del premio por lotería de origen. */
  sourcePosition?: number;
  drawDate: string;
  /** Solo participan números pagados completos hasta esta fecha (inclusive). */
  paidBefore?: string;
  excludePreviousWinners: boolean;
  /** Si el número resultante no está pagado: ruleta entre pagados o desierto. */
  fallback: "roulette" | "none";
  draw?: Draw;
}

export interface Raffle {
  id: string;
  slug: string;
  name: string;
  description: string;
  theme: string;
  numberCount: number;
  price: number;
  minDeposit: number;
  paymentDeadline: string;
  drawDate: string;
  paymentInfo: string;
  organizerPhone: string;
  /** Meta de recaudo (opcional) para la alcancía del panel. */
  goal?: number;
  status: RaffleStatus;
  createdAt: string;
  prizes: Prize[];
}

export interface Payment {
  amount: number;
  method: string;
  note: string;
  at: string;
}

export interface Ticket {
  id: string;
  raffleId: string;
  number: number;
  player: { name: string; phone: string };
  paidAmount: number;
  paidInFullAt: string | null;
  payments: Payment[];
  createdAt: string;
}

export type NewRaffle = Omit<Raffle, "id" | "createdAt">;

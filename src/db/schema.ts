import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

/** Una rifa: todo lo que cambia entre rifas vive aquí y en `prizes`. */
export const raffles = sqliteTable("raffles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** Clave de tema visual (ver src/lib/themes.ts). */
  theme: text("theme").notNull().default("generico"),
  /** Cantidad de números: 100 => 00..99. */
  numberCount: integer("number_count").notNull(),
  /** Valor de cada número en pesos. */
  price: integer("price").notNull(),
  /** Abono mínimo para apartar un número. */
  minDeposit: integer("min_deposit").notNull(),
  /** Último día (YYYY-MM-DD, inclusive) para tener el número pagado completo. */
  paymentDeadline: text("payment_deadline").notNull(),
  /** Fecha del sorteo principal (YYYY-MM-DD). */
  drawDate: text("draw_date").notNull(),
  /** Instrucciones de pago (Nequi, Daviplata, etc.). */
  paymentInfo: text("payment_info").notNull().default(""),
  /** Número de WhatsApp de quien organiza, con indicativo (57...). */
  organizerPhone: text("organizer_phone").notNull().default(""),
  status: text("status", { enum: ["draft", "active", "closed", "finished"] })
    .notNull()
    .default("active"),
  createdAt: createdAt(),
});

export const prizes = sqliteTable("prizes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  raffleId: integer("raffle_id")
    .notNull()
    .references(() => raffles.id, { onDelete: "cascade" }),
  /** Orden en que se muestra y se sortea. */
  position: integer("position").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind", { enum: ["cash", "item", "refund"] }).notNull(),
  /** Valor en pesos (estimado si es en especie). */
  value: integer("value").notNull(),
  /**
   * lottery: últimas cifras de una lotería oficial.
   * roulette: ruleta verificable entre números elegibles.
   * reverse: número invertido del ganador de otro premio (37 -> 73).
   */
  method: text("method", { enum: ["lottery", "roulette", "reverse"] }).notNull(),
  lotteryName: text("lottery_name"),
  /** Para `reverse`: el premio del que se deriva. */
  sourcePosition: integer("source_position"),
  drawDate: text("draw_date").notNull(),
  /** Solo participan números pagados completos hasta esta fecha (inclusive). */
  paidBefore: text("paid_before"),
  /** Un número que ya ganó otro premio de ruleta no vuelve a participar. */
  excludePreviousWinners: integer("exclude_previous_winners", { mode: "boolean" })
    .notNull()
    .default(true),
  /** Qué hacer si el número resultante no está pagado. */
  fallback: text("fallback", { enum: ["roulette", "none"] }).notNull().default("roulette"),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  createdAt: createdAt(),
});

export const tickets = sqliteTable(
  "tickets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    raffleId: integer("raffle_id")
      .notNull()
      .references(() => raffles.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id),
    paidAmount: integer("paid_amount").notNull().default(0),
    /** Momento en que el número quedó pagado completo. */
    paidInFullAt: text("paid_in_full_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tickets_raffle_number").on(t.raffleId, t.number)],
);

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("nequi"),
  note: text("note").notNull().default(""),
  createdAt: createdAt(),
});

export const draws = sqliteTable("draws", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prizeId: integer("prize_id")
    .notNull()
    .unique()
    .references(() => prizes.id, { onDelete: "cascade" }),
  /**
   * committed: semilla generada y su hash publicado (ruleta lista para girar).
   * done: hay número ganador.
   * void: sin ganador (desierto).
   */
  status: text("status", { enum: ["committed", "done", "void"] }).notNull(),
  /** Hash SHA-256 de la semilla, publicado antes de girar. */
  seedHash: text("seed_hash"),
  /** Semilla secreta; se revela al girar. */
  seed: text("seed"),
  /** Resultado de la lotería tal como se publicó (p. ej. "4837"). */
  lotteryResult: text("lottery_result"),
  /** Números elegibles (JSON) usados en la ruleta, para verificar. */
  eligible: text("eligible"),
  winningNumber: integer("winning_number"),
  note: text("note").notNull().default(""),
  createdAt: createdAt(),
  doneAt: text("done_at"),
});

export type Raffle = typeof raffles.$inferSelect;
export type Prize = typeof prizes.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Draw = typeof draws.$inferSelect;

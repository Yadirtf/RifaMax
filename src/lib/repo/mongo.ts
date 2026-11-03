import { MongoClient, ObjectId, type Collection, type Db } from "mongodb";
import type { Raffle, RaffleEvent, Ticket } from "../types";
import type { Repo } from "./types";

type RaffleDoc = Omit<Raffle, "id"> & { _id: ObjectId };
type TicketDoc = Omit<Ticket, "id" | "raffleId"> & { _id: ObjectId; raffleId: ObjectId };
type EventDoc = Omit<RaffleEvent, "id" | "raffleId"> & { _id: ObjectId; raffleId: ObjectId };
type SettingDoc = { _id: string; value: unknown };

const g = globalThis as unknown as { rifamaxMongo?: Promise<Db> };

function connect(uri: string): Promise<Db> {
  if (!g.rifamaxMongo) {
    g.rifamaxMongo = (async () => {
      // Pocas conexiones: las funciones de Vercel se multiplican y M0 tiene límite.
      const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const db = client.db(process.env.MONGODB_DB || "rifamax");
      await Promise.all([
        db.collection("raffles").createIndex({ slug: 1 }, { unique: true }),
        db.collection("tickets").createIndex({ raffleId: 1, number: 1 }, { unique: true }),
        db.collection("tickets").createIndex({ raffleId: 1, "player.phone": 1 }),
        db.collection("events").createIndex({ raffleId: 1, at: -1 }),
      ]);
      return db;
    })().catch((e) => {
      g.rifamaxMongo = undefined;
      throw e;
    });
  }
  return g.rifamaxMongo;
}

function oid(id: string): ObjectId | null {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

const toRaffle = ({ _id, ...rest }: RaffleDoc): Raffle => ({ id: String(_id), ...rest });
const toTicket = ({ _id, raffleId, ...rest }: TicketDoc): Ticket => ({ id: String(_id), raffleId: String(raffleId), ...rest });

const isDuplicate = (e: unknown) => (e as { code?: number })?.code === 11000;

export function mongoRepo(uri: string): Repo {
  const raffles = async () => (await connect(uri)).collection<RaffleDoc>("raffles");
  const tickets = async () => (await connect(uri)).collection<TicketDoc>("tickets");
  const events = async () => (await connect(uri)).collection<EventDoc>("events");
  const settings = async () => (await connect(uri)).collection<SettingDoc>("settings");

  async function findTicket(col: Collection<TicketDoc>, raffleId: string, ticketId: string) {
    const r = oid(raffleId);
    const t = oid(ticketId);
    return r && t ? { r, t, col } : null;
  }

  return {
    async listRaffles() {
      return (await (await raffles()).find().sort({ drawDate: 1 }).toArray()).map(toRaffle);
    },

    async getRaffle(by) {
      const col = await raffles();
      if ("slug" in by) {
        const doc = await col.findOne({ slug: by.slug });
        return doc ? toRaffle(doc) : null;
      }
      const id = oid(by.id);
      const doc = id ? await col.findOne({ _id: id }) : null;
      return doc ? toRaffle(doc) : null;
    },

    async createRaffle(raffle) {
      try {
        const res = await (await raffles()).insertOne({
          _id: new ObjectId(),
          ...raffle,
          createdAt: new Date().toISOString(),
        });
        return { ok: true, id: String(res.insertedId) };
      } catch (e) {
        if (isDuplicate(e)) return { ok: false, reason: "slug" };
        throw e;
      }
    },

    async updateRaffle(id, patch) {
      const _id = oid(id);
      if (_id) await (await raffles()).updateOne({ _id }, { $set: patch });
    },

    async setDraw(raffleId, prizeId, draw, expect) {
      const _id = oid(raffleId);
      if (!_id) return false;
      const cond: Record<string, unknown> = { id: prizeId };
      if (expect === "none") cond.draw = { $exists: false };
      else if (expect) cond["draw.status"] = expect;
      const update = draw ? { $set: { "prizes.$.draw": draw } } : { $unset: { "prizes.$.draw": "" as const } };
      const res = await (await raffles()).updateOne({ _id, prizes: { $elemMatch: cond } }, update);
      return res.matchedCount === 1;
    },

    async listTickets(raffleId) {
      const r = oid(raffleId);
      if (!r) return [];
      return (await (await tickets()).find({ raffleId: r }).sort({ number: 1 }).toArray()).map(toTicket);
    },

    async findTicketsByPhone(raffleId, phone) {
      const r = oid(raffleId);
      if (!r) return [];
      return (await (await tickets()).find({ raffleId: r, "player.phone": phone }).sort({ number: 1 }).toArray()).map(toTicket);
    },

    async reserveTicket(raffleId, number, player, opts) {
      const r = oid(raffleId);
      if (!r) return null;
      const doc: TicketDoc = {
        _id: new ObjectId(),
        raffleId: r,
        number,
        player,
        paidAmount: 0,
        paidInFullAt: null,
        payments: [],
        createdAt: new Date().toISOString(),
        ...(opts ? { source: opts.source, confirmedAt: opts.confirmedAt ?? null } : {}),
      };
      try {
        await (await tickets()).insertOne(doc);
        return toTicket(doc);
      } catch (e) {
        if (isDuplicate(e)) return null;
        throw e;
      }
    },

    async addPayment(raffleId, ticketId, payment, price) {
      const ref = await findTicket(await tickets(), raffleId, ticketId);
      if (!ref || payment.amount <= 0) return null;
      // Una sola operación atómica: solo aplica si el abono cabe en el saldo.
      const doc = await ref.col.findOneAndUpdate(
        { _id: ref.t, raffleId: ref.r, paidAmount: { $lte: price - payment.amount } },
        [
          {
            $set: {
              paidAmount: { $add: ["$paidAmount", payment.amount] },
              payments: { $concatArrays: [{ $ifNull: ["$payments", []] }, [{ $literal: payment }]] },
            },
          },
          { $set: { paidInFullAt: { $cond: [{ $gte: ["$paidAmount", price] }, payment.at, null] } } },
        ],
        { returnDocument: "after" },
      );
      return doc ? toTicket(doc) : null;
    },

    async releaseTicket(raffleId, ticketId) {
      const ref = await findTicket(await tickets(), raffleId, ticketId);
      if (ref) await ref.col.deleteOne({ _id: ref.t, raffleId: ref.r });
    },

    async setConfirmed(raffleId, ticketId, confirmedAt) {
      const ref = await findTicket(await tickets(), raffleId, ticketId);
      if (!ref) return null;
      const doc = await ref.col.findOneAndUpdate({ _id: ref.t, raffleId: ref.r }, { $set: { confirmedAt } }, { returnDocument: "after" });
      return doc ? toTicket(doc) : null;
    },

    async releaseIfUnclaimed(raffleId, ticketId, createdBefore) {
      const ref = await findTicket(await tickets(), raffleId, ticketId);
      if (!ref) return false;
      const res = await ref.col.deleteOne({
        _id: ref.t,
        raffleId: ref.r,
        source: "online",
        paidAmount: 0,
        confirmedAt: { $in: [null] },
        createdAt: { $lt: createdBefore },
      });
      return res.deletedCount === 1;
    },

    async addEvent({ raffleId, ...rest }) {
      const r = oid(raffleId);
      if (r) await (await events()).insertOne({ _id: new ObjectId(), raffleId: r, ...rest });
    },

    async listEvents(raffleId, limit) {
      const r = oid(raffleId);
      if (!r) return [];
      const docs = await (await events()).find({ raffleId: r }).sort({ at: -1 }).limit(limit).toArray();
      return docs.map(({ _id, raffleId: rid, ...rest }) => ({ id: String(_id), raffleId: String(rid), ...rest }));
    },

    async getSetting<T>(key: string) {
      const doc = await (await settings()).findOne({ _id: key });
      return doc ? (doc.value as T) : null;
    },

    async setSetting(key, value) {
      const col = await settings();
      if (value === null) await col.deleteOne({ _id: key });
      else await col.updateOne({ _id: key }, { $set: { value } }, { upsert: true });
    },
  };
}


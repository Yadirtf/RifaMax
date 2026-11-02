/**
 * Crea la Rifa Navideña 2026 en MongoDB si no existe.
 * Uso: MONGODB_URI="mongodb+srv://..." npm run db:seed
 */
import { MongoClient } from "mongodb";
import { christmasRaffle } from "../src/lib/repo/seed";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Define MONGODB_URI con la cadena de conexión de MongoDB Atlas.");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "rifamax");
  const raffles = db.collection("raffles");
  await raffles.createIndex({ slug: 1 }, { unique: true });
  await db.collection("tickets").createIndex({ raffleId: 1, number: 1 }, { unique: true });
  await db.collection("tickets").createIndex({ raffleId: 1, "player.phone": 1 });
  const raffle = christmasRaffle();
  if (await raffles.findOne({ slug: raffle.slug })) {
    console.log(`La rifa "${raffle.slug}" ya existe. No se cambió nada.`);
  } else {
    await raffles.insertOne({ ...raffle, createdAt: new Date().toISOString() });
    console.log(`Rifa creada: /rifa/${raffle.slug}`);
  }
  await client.close();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

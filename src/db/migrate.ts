/** Aplica las migraciones de ./drizzle. Uso: npm run db:migrate */
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import { db } from "./index";

async function main() {
  if ((process.env.DATABASE_URL ?? "file:./data/").startsWith("file:")) {
    mkdirSync("data", { recursive: true });
  }
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

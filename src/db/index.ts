import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/rifamax.db";

const globalForDb = globalThis as unknown as { rifamaxClient?: ReturnType<typeof createClient> };

const client =
  globalForDb.rifamaxClient ??
  createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

if (process.env.NODE_ENV !== "production") globalForDb.rifamaxClient = client;

export const db = drizzle(client, { schema });
export { schema };

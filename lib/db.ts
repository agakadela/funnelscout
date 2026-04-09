import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";
import { env } from "@/lib/env";

const globalForDb = globalThis as typeof globalThis & {
  __funnelscoutPostgres?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__funnelscoutPostgres ??
  postgres(env.database.url, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__funnelscoutPostgres = client;
}

export const db = drizzle(client, { schema });

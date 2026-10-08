import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * One connection pool per server process, opened on first use (not at import), so `next build` works without a
 * database. In development the module reloads often, so the pool is kept on globalThis. In production (Neon)
 * use the *pooled* connection string.
 */
const g = globalThis as unknown as { __sysdSql?: ReturnType<typeof postgres>; __sysdDb?: Db };

function open(): Db {
  if (g.__sysdDb) return g.__sysdDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run `npm run db:up` and see .env.example.");
  g.__sysdSql = postgres(url, { max: process.env.NODE_ENV === "production" ? 5 : 10, idle_timeout: 20, connect_timeout: 10 });
  return (g.__sysdDb = drizzle(g.__sysdSql, { schema }));
}

export const db: Db = new Proxy({} as Db, { get: (_t, prop) => Reflect.get(open(), prop) });

/** For scripts and tests: closes the pool. */
export async function closeDb() { await g.__sysdSql?.end(); g.__sysdSql = undefined; g.__sysdDb = undefined; }
export { schema };

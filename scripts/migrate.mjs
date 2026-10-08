// Applies the SQL migrations in ./drizzle to DATABASE_URL. Safe to run repeatedly.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try { process.loadEnvFile(".env.local"); } catch { /* production sets real env vars */ }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql.end();
console.log("migrations applied");

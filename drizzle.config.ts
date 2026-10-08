import { defineConfig } from "drizzle-kit";

try { process.loadEnvFile(".env.local"); } catch { /* production sets real env vars */ }

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});

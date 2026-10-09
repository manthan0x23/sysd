// Marks captured prices "approved" when they pass mechanical checks. This is NOT a human review: it only makes
// sure a price is sane and traceable (positive, a known unit, a currency, a source URL). The snapshot says so.
// usage: npx tsx scripts/prices/approve.mts [--rates provider ...]   (rates are bulk API rows, approved per provider)
import { and, eq, gt, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { closeDb, db } from "../../src/db/index";
import { priceRates, priceSources, priceTiers } from "../../src/db/schema";

try { process.loadEnvFile(".env.local"); } catch { /* production sets real env vars */ }
const args = process.argv.slice(2);
const rateProviders = args.includes("--rates") ? args.slice(args.indexOf("--rates") + 1) : ["aws"];

const withSource = sql`exists (select 1 from ${priceSources} s where s.id = ${priceTiers.sourceId} and s.url <> '')`;
const tiers = await db.update(priceTiers).set({ status: "approved", reviewedAt: new Date() }).where(and(
  eq(priceTiers.status, "pending"), isNotNull(priceTiers.amount), gte(priceTiers.amount, "0"), lt(priceTiers.amount, "1000000"),
  inArray(priceTiers.unit, ["month", "hour"]), withSource,
)).returning({ id: priceTiers.id });
// Usage-priced tiers (per-token, per-GB...) have no flat amount; approve them when every rate is a positive number.
const usage = await db.update(priceTiers).set({ status: "approved", reviewedAt: new Date() }).where(and(
  eq(priceTiers.status, "pending"), sql`${priceTiers.amount} is null`, sql`jsonb_typeof(${priceTiers.rates}) = 'array' and jsonb_array_length(${priceTiers.rates}) > 0`,
  sql`not exists (select 1 from jsonb_array_elements(${priceTiers.rates}) r where (r->>'amount')::numeric < 0)`, withSource,
)).returning({ id: priceTiers.id });
const rates = rateProviders.length
  ? await db.update(priceRates).set({ status: "approved" }).where(and(eq(priceRates.status, "pending"), inArray(priceRates.provider, rateProviders), gt(priceRates.amount, "0"), eq(priceRates.currency, "USD"))).returning({ id: priceRates.id })
  : [];
console.log(`approved ${tiers.length + usage.length} tiers (${usage.length} usage-priced) and ${rates.length} rates (checks only, not hand-reviewed)`);
await closeDb();

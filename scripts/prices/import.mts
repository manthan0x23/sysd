// Loads captured prices into Postgres as status "pending". Nothing is approved or published here.
// usage: npx tsx scripts/prices/import.mts [--replace] [--dry] [provider-or-file ...]
//   reads data/prices/extracted/*.json (scraped, hand-extracted tiers) and data/prices/pending/*.json (API dumps)
//   re-running is safe: a source already imported (same provider, kind, fetched_at) is skipped; --replace redoes it
//   only if every row of it is still pending.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { closeDb, db } from "../../src/db/index";
import { priceRates, priceSources, priceTiers } from "../../src/db/schema";
import { OFFERING_BY_ID } from "../../src/lib/catalog/offerings";

try { process.loadEnvFile(".env.local"); } catch { /* production sets real env vars */ }

const ROOT = join(process.cwd(), "data", "prices");
const args = process.argv.slice(2);
const replace = args.includes("--replace");
const dry = args.includes("--dry");
const only = args.filter((a) => !a.startsWith("--"));

// API files use their own short offering names; map them to catalog ids (same mapping as coverage.mjs).
const API_OFFERINGS: Record<string, Record<string, string>> = {
  "akamai-linode": { "compute:": "vps:akamai-linode:shared-cpu", "storage:object": "object:akamai-linode:object-storage" },
  vultr: { "compute:": "vps:vultr:cloud-compute" },
  scaleway: { "compute:": "vps:scaleway:instances" },
};
const apiOffering = (provider: string, name: string) => {
  const m = API_OFFERINGS[provider] ?? {};
  return m[name] ?? Object.entries(m).find(([k]) => k.endsWith(":") && name.startsWith(k))?.[1] ?? name;
};

type Json = Record<string, any>;
const num = (n: unknown) => (n == null ? null : String(n));
const BATCH = 1000;

/** Keys must be unique inside a source; a repeated key gets a #n suffix instead of failing the import. */
function uniqueKeys<T>(rows: T[], keyOf: (r: T) => string): string[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const k = keyOf(r), n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    return n ? `${k}#${n}` : k;
  });
}

function tierRows(provider: string, d: Json, kind: "scrape" | "api") {
  const raw: Json[] = d.tiers ?? [];
  const mapped = raw.map((t) => {
    if (kind === "scrape") {
      const { offerings, tier, spec, price, hourly, rates, note, region, currency, ...extra } = t;
      return { offerings: offerings as string[], tier: tier as string, spec: spec ?? {}, price, hourly, rates, note, region: region ?? null, currency: currency ?? d.currency, extra };
    }
    const { offering, tierId, label, spec, price, currency, region, regionPrices, locations, source, api } = t;
    return {
      offerings: [apiOffering(provider, offering)], tier: tierId as string, spec: spec ?? {}, price: price && { amount: price.amount, unit: price.unit },
      hourly: price?.hourly, rates: undefined, note: label && label !== tierId ? label : null, region: region === "default" ? null : region, currency: currency ?? d.currency,
      extra: { regionPrices, locations, source, api, apiOffering: offering },
    };
  });
  const keys = uniqueKeys(mapped, (t) => [provider, [...t.offerings].sort().join("+"), t.tier, t.region ?? ""].join("|"));
  return mapped.map((t, i) => {
    const extra = Object.fromEntries(Object.entries(t.extra ?? {}).filter(([, v]) => v !== undefined && v !== null));
    return {
      provider, offerings: t.offerings, tier: t.tier, region: t.region, key: keys[i], spec: t.spec,
      amount: num(t.price?.amount), unit: t.price?.unit ?? null, currency: t.currency as string,
      hourly: num(t.hourly), rates: t.rates ?? null, extra: Object.keys(extra).length ? extra : null, note: t.note ?? null,
    };
  });
}

/** Bulk API rate rows from AWS / Azure / Oracle / Scaleway, normalised to one shape. */
function rateRows(provider: string, d: Json) {
  const rows: Json[] = d.rates ?? [];
  const mapped = rows.map((r) => {
    if (provider === "aws") return { service: d.service, region: d.region, sku: r.sku, id: `${r.sku}|${r.begin}`, description: r.description, unit: r.unit, amount: r.usd, currency: "USD", tierMin: r.begin, attrs: { family: r.family, usagetype: r.usagetype, operation: r.operation, end: r.end, ...r.attrs } };
    if (provider === "microsoft-azure") return { service: d.service, region: r.region, sku: r.meterId, id: `${r.meterId}|${r.tierMin}|${r.region}`, description: [r.product, r.sku, r.meter].filter(Boolean).join(" / "), unit: r.unit, amount: r.usd, currency: "USD", tierMin: r.tierMin, attrs: { product: r.product, sku: r.sku, meter: r.meter, armSku: r.armSku, type: r.type, effective: r.effective } };
    if (provider === "oracle-cloud") return { service: r.category ?? "oracle", region: null, sku: r.partNumber, id: `${r.partNumber}|${r.model}`, description: r.product, unit: r.unit, amount: r.usd, currency: "USD", tierMin: null, attrs: { category: r.category, model: r.model } };
    if (provider === "scaleway") return { service: r.productCategory ?? r.category ?? "scaleway", region: null, sku: r.sku, id: r.sku, description: r.description, unit: r.unit, amount: r.eur, currency: "EUR", tierMin: null, attrs: { category: r.category, productCategory: r.productCategory, product: r.product, variant: r.variant, unitSize: r.unitSize, status: r.status } };
    throw new Error(`no rate mapper for provider ${provider}`);
  });
  const keys = uniqueKeys(mapped, (r) => `${provider}|${r.service}|${r.id}`);
  const offerings: string[] = (d.offerings ?? []).filter((o: string) => OFFERING_BY_ID[o]);
  return mapped.map((r, i) => ({
    provider, service: String(r.service), offerings, region: r.region ?? null, sku: r.sku ?? null, key: keys[i], description: r.description ?? null,
    unit: String(r.unit ?? ""), amount: num(r.amount) ?? "0", currency: r.currency, tierMin: num(r.tierMin), attrs: r.attrs,
  }));
}

async function importFile(path: string, kind: "scrape" | "api") {
  const d: Json = JSON.parse(readFileSync(path, "utf8"));
  const provider: string = d.provider;
  const fetchedAt = new Date(d.fetchedAt);
  const urls: string[] = d.sources ?? (d.source ? [d.source] : d.tiers?.[0]?.source ? [d.tiers[0].source] : []);
  const label = `${kind}:${path.split("/").pop()}`;

  const tiers = d.tiers?.length ? tierRows(provider, d, kind) : [];
  const rates = d.rates?.length ? rateRows(provider, d) : [];
  // Catalog check: a tier pointing at an unknown offering would never be found by the app.
  const unknown = [...new Set([...tiers.flatMap((t) => t.offerings), ...rates.flatMap((r) => r.offerings)])].filter((o) => !OFFERING_BY_ID[o]);
  if (unknown.length) throw new Error(`${label}: unknown offering ids ${unknown.join(", ")}`);
  if (dry) return console.log(`${label}: would import ${tiers.length} tiers, ${rates.length} rates`);

  const existing = await db.select().from(priceSources).where(and(eq(priceSources.provider, provider), eq(priceSources.kind, kind), eq(priceSources.fetchedAt, fetchedAt), sql`${priceSources.meta}->>'file' = ${path.split("/").pop()}`));
  if (existing.length) {
    if (!replace) return console.log(`${label}: already imported, skipped`);
    const ids = existing.map((s) => s.id);
    const [t, r] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(priceTiers).where(and(inArray(priceTiers.sourceId, ids), ne(priceTiers.status, "pending"))),
      db.select({ n: sql<number>`count(*)::int` }).from(priceRates).where(and(inArray(priceRates.sourceId, ids), ne(priceRates.status, "pending"))),
    ]);
    if (t[0].n + r[0].n) throw new Error(`${label}: has reviewed rows, refusing to replace`);
    await db.delete(priceSources).where(inArray(priceSources.id, ids));
  }

  await db.transaction(async (tx) => {
    const [src] = await tx.insert(priceSources).values({
      provider, kind, url: urls[0] ?? d.api ?? "", urls, fetchedAt, version: d.priceListVersion ?? d.lastUpdated ?? null,
      notes: d.notes ?? d.note ?? null,
      meta: { file: path.split("/").pop(), service: d.service, region: d.region, api: d.api, apiSource: d.source, truncated: d.truncated, currency: d.currency },
    }).returning({ id: priceSources.id });
    for (let i = 0; i < tiers.length; i += BATCH) await tx.insert(priceTiers).values(tiers.slice(i, i + BATCH).map((t) => ({ ...t, sourceId: src.id })));
    for (let i = 0; i < rates.length; i += BATCH) await tx.insert(priceRates).values(rates.slice(i, i + BATCH).map((r) => ({ ...r, sourceId: src.id })));
  });
  console.log(`${label}: ${tiers.length} tiers, ${rates.length} rates`);
}

const wanted = (f: string) => !only.length || only.includes(f.replace(/\.json$/, ""));
let failed = 0;
for (const [dir, kind] of [["extracted", "scrape"], ["pending", "api"]] as const) {
  for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json") && wanted(f)).sort()) {
    try { await importFile(join(ROOT, dir, f), kind); } catch (e) { failed++; console.error(`${dir}/${f}: ${(e as Error).message}`); }
  }
}
await closeDb();
if (failed) { console.error(`${failed} file(s) failed`); process.exit(1); }

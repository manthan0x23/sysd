// Builds src/lib/pricing/snapshot.json, the prices the canvas cost engine uses, from APPROVED rows in Postgres.
// The engine runs in the browser, so this file is committed. usage: npx tsx scripts/prices/snapshot.mts
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { closeDb, db } from "../../src/db/index";
import { priceRates, priceSources, priceTiers } from "../../src/db/schema";
import { OFFERING_BY_ID } from "../../src/lib/catalog/offerings";

try { process.loadEnvFile(".env.local"); } catch { /* production sets real env vars */ }
const OUT = "src/lib/pricing/snapshot.json";
const HOURS = 730;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Compact plan: i id, l label, c vcpu, r ramGb, d diskGb, p monthly USD, t [in, out, cached] per 1M tokens, n note. */
interface P { i: string; l: string; c?: number; r?: number; d?: number; p?: number; t?: [number, number, number?]; n?: string | number; f?: 1; lim?: Record<string, number> }
const plans: Record<string, P[]> = {};
const sources: Record<string, { url: string; at: string }> = {};
const add = (offering: string, p: P, src: { url: string; at: string }) => {
  if (!OFFERING_BY_ID[offering]) return;
  const list = (plans[offering] ??= []);
  let id = p.i, n = 1;
  while (list.some((x) => x.i === id)) id = `${p.i}-${++n}`;
  list.push({ ...p, i: id });
  sources[offering] ??= src;
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

// ----- free-tier limits read by hand from provider pages (see the file's own note)
interface Curated { match?: [string, string]; offering?: string; label?: string; limits?: Record<string, number>; spec?: { vcpu: number; ramGb: number; diskGb: number }; note?: string; source?: string; at?: string }
const curated = (JSON.parse(readFileSync("scripts/prices/free-tiers.json", "utf8")) as { tiers: Curated[] }).tiers;
const byMatch = new Map(curated.filter((c) => c.match).map((c) => [c.match!.join("|"), c]));
const usedMatch = new Set<string>();
const joinNote = (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(" ") || undefined;

// ----- tiers (scraped pages and provider plan APIs)
const tiers = await db.select({ t: priceTiers, s: priceSources }).from(priceTiers).innerJoin(priceSources, eq(priceSources.id, priceTiers.sourceId)).where(eq(priceTiers.status, "approved"));
const API_KEEP: Record<string, string[]> = { "akamai-linode": ["compute:shared"], vultr: ["compute:shared", "compute:high-frequency", "compute:high-performance"] };
for (const { t, s } of tiers) {
  if (t.currency !== "USD") continue;
  const src = { url: s.url, at: ymd(s.fetchedAt) };
  const keep = API_KEEP[t.provider];
  if (keep && !keep.includes((t.extra as { apiOffering?: string } | null)?.apiOffering ?? "")) continue;
  const spec = t.spec as Record<string, unknown>;
  for (const o of t.offerings) {
    if (!OFFERING_BY_ID[o] || OFFERING_BY_ID[o].typeId === "object") continue;
    // Language-model prices: input and output per million tokens.
    const rates = t.rates ?? [];
    const rate = (n: string) => rates.find((r) => r.name === n)?.amount;
    if (OFFERING_BY_ID[o].typeId === "llm") {
      const i = rate("input"), out = rate("output");
      if (i != null && out != null) add(o, { i: slug(t.tier), l: t.tier, t: [i, out, rate("cached input")], ...(t.note ? { n: t.note } : {}) }, src);
      continue;
    }
    if (t.amount == null || !t.unit) continue;
    const amount = Number(t.amount);
    const monthly = t.unit === "month" ? amount : t.unit === "hour" ? amount * HOURS : null;
    // A $0 tier is a free tier (not a time-limited trial, not open-source software you run yourself).
    // Pages that say "starting at $0", pay-as-you-go, or "$5 free credits" are usage-priced, not a free tier.
    const nameOk = /free|hobby|starter|personal|developer|build|forever|spark|always|sandbox/i.test(t.tier) && !/pay as you go|standard|plus/i.test(t.tier);
    const noteOk = !/starting at|starts at|from \$0|credits?|plus compute|usage-based/i.test(t.note ?? "");
    const freeLike = (nameOk && noteOk) || byMatch.has(`${t.provider}|${t.tier}`);
    const free = monthly === 0 && freeLike && !/trial/i.test(t.tier) && OFFERING_BY_ID[o].model !== "self-hosted";
    if (monthly == null || !(monthly > 0 || free)) continue;
    const cur = byMatch.get(`${t.provider}|${t.tier}`);
    if (cur) usedMatch.add(`${t.provider}|${t.tier}`);
    const vcpu = num(spec.vcpu), ram = num(spec.ramGb), disk = num(spec.diskGb);
    const note = joinNote(t.note, cur?.note);
    add(o, { i: slug(t.tier), l: t.tier, ...(vcpu != null ? { c: vcpu } : {}), ...(ram != null ? { r: ram } : {}), ...(disk != null ? { d: disk } : {}), p: r4(monthly), ...(free ? { f: 1 as const } : {}), ...(free && cur?.limits ? { lim: cur.limits } : {}), ...(note ? { n: note } : {}) }, src);
  }
}

// Free plans that were never captured as a $0 price (always-free allowances inside bigger products).
for (const c of curated) {
  if (!c.offering || !c.label || !c.source || !c.at) continue;
  add(c.offering, {
    i: slug(c.label), l: c.label, p: 0, f: 1,
    ...(c.spec ? { c: c.spec.vcpu, r: c.spec.ramGb, d: c.spec.diskGb } : {}), ...(c.limits ? { lim: c.limits } : {}), ...(c.note ? { n: c.note } : {}),
  }, { url: c.source, at: c.at });
}
for (const k of byMatch.keys()) if (!usedMatch.has(k)) console.log(`warning: free-tier entry for ${k} matched no approved tier`);

// ----- AWS: instance prices from the Price List (on-demand, US East), one plan per instance type
const rows = await db.select({ r: priceRates, s: priceSources }).from(priceRates).innerJoin(priceSources, eq(priceSources.id, priceRates.sourceId))
  .where(and(eq(priceRates.provider, "aws"), eq(priceRates.status, "approved"), eq(priceRates.unit, "Hrs")));
const mem = (v: unknown) => { const m = /([\d.]+)\s*GiB/.exec(String(v ?? "")); return m ? Number(m[1]) : undefined; };
const AWS: { service: string; page: string; match: (a: Record<string, string>) => string | null; note: string }[] = [
  { service: "AmazonEC2", page: "https://aws.amazon.com/ec2/pricing/on-demand/", match: (a) => (a.instanceType && a.usagetype === `BoxUsage:${a.instanceType}` && a.tenancy === "Shared" && a.operatingSystem === "Linux" ? "vps:aws:ec2" : null), note: "On-demand Linux, US East. Instance only: disk (EBS) and data transfer are extra." },
  { service: "AmazonRDS", page: "https://aws.amazon.com/rds/pricing/", match: (a) => (a.deploymentOption === "Single-AZ" && a.instanceType?.startsWith("db.") && a.usagetype === `InstanceUsage:${a.instanceType}` ? ({ PostgreSQL: "postgres:aws:rds-for-postgresql", MySQL: "mysql:aws:rds-for-mysql", MariaDB: "mysql:aws:rds-for-mariadb" } as Record<string, string>)[a.databaseEngine] ?? null : null), note: "On-demand Single-AZ, US East. Instance only: storage, I/O and backups are extra." },
  { service: "AmazonElastiCache", page: "https://aws.amazon.com/elasticache/pricing/", // Standard node-hours only: Outposts, extended-support and reserved rows have other usage types.
    match: (a) => (a.instanceType?.startsWith("cache.") && a.usagetype === `NodeUsage:${a.instanceType}` ? ({ Redis: "redis:aws:elasticache-for-redis", Memcached: "memcached:aws:elasticache-for-memcached" } as Record<string, string>)[a.cacheEngine] ?? null : null), note: "On-demand node, US East. Node only: data transfer and backups are extra." },
];
for (const cfg of AWS) {
  const best = new Map<string, { offering: string; type: string; usd: number; vcpu?: number; ram?: number; at: string }>();
  for (const { r, s } of rows) {
    if (r.service !== cfg.service) continue;
    const a = (r.attrs ?? {}) as Record<string, string>;
    const offering = cfg.match(a);
    if (!offering) continue;
    const key = `${offering}|${a.instanceType}`;
    const usd = Number(r.amount);
    const prev = best.get(key);
    // Several rows can share an instance type (licence, tenancy variants that slipped through); the cheapest listed hourly rate is the standard one.
    if (!prev || usd < prev.usd) best.set(key, { offering, type: a.instanceType, usd, vcpu: Number(a.vcpu) || undefined, ram: mem(a.memory), at: ymd(s.fetchedAt) });
  }
  for (const b of best.values()) {
    if (!(b.usd > 0) || b.vcpu == null || b.ram == null) continue;
    add(b.offering, { i: slug(b.type), l: b.type, c: b.vcpu, r: b.ram, d: 0, p: r4(b.usd * HOURS), n: cfg.note }, { url: cfg.page, at: b.at });
  }
}

// ----- very long lists (EC2 alone has 1,400 instance types) are thinned to the cheapest plan per vCPU/RAM size,
// which is also what "auto" would pick, so the picker stays usable and the file small.
const THIN_ABOVE = 100;
for (const [k, list] of Object.entries(plans)) {
  if (list.length <= THIN_ABOVE || list.some((p) => p.c == null || p.r == null)) continue;
  const bySize = new Map<string, P>();
  for (const p of list) { const key = `${p.c}|${p.r}`; const cur = bySize.get(key); if (!cur || (p.p ?? 0) < (cur.p ?? 0)) bySize.set(key, p); }
  console.log(`thinned ${k}: ${list.length} -> ${bySize.size}`);
  plans[k] = [...bySize.values()];
}

// ----- write (stable order so the diff is readable)
for (const k of Object.keys(plans)) plans[k].sort((a, b) => (a.p ?? a.t?.[0] ?? 0) - (b.p ?? b.t?.[0] ?? 0) || a.l.localeCompare(b.l));
// Notes repeat across hundreds of plans; keep each once and point at it by index.
const notes: string[] = [];
for (const list of Object.values(plans)) for (const p of list) if (typeof p.n === "string") { let k = notes.indexOf(p.n); if (k < 0) k = notes.push(p.n) - 1; p.n = k; }
const previous = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, "utf8")) as { version: number }).version : 0;
const snap = {
  version: previous + 1, builtAt: new Date().toISOString(),
  /** "checks-only": prices passed mechanical sanity checks and carry their source, but nobody has compared them with the page by hand. */
  review: "checks-only" as const,
  notes,
  sources: Object.fromEntries(Object.keys(plans).sort().map((k) => [k, sources[k]])),
  plans: Object.fromEntries(Object.keys(plans).sort().map((k) => [k, plans[k]])),
};
writeFileSync(OUT, JSON.stringify(snap) + "\n");
const n = Object.values(plans).reduce((a, l) => a + l.length, 0);
console.log(`snapshot v${snap.version}: ${n} plans across ${Object.keys(plans).length} offerings -> ${OUT} (${Math.round(JSON.stringify(snap).length / 1024)} KB)`);
await closeDb();

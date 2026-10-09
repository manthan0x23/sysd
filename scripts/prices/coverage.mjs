// Which catalog offerings have at least one captured price? usage: npx tsx scripts/prices/coverage.mjs [--list]
import { readdirSync, readFileSync } from "node:fs";
import { OFFERINGS } from "../../src/lib/catalog/offerings.ts";

const D = new URL("../../data/prices/", import.meta.url).pathname;
const covered = new Map(); // offering id -> sources
const add = (id, src) => covered.set(id, [...(covered.get(id) ?? []), src]);
for (const f of readdirSync(D + "extracted").filter((f) => f.endsWith(".json"))) {
  const d = JSON.parse(readFileSync(D + "extracted/" + f, "utf8"));
  for (const t of d.tiers) for (const o of t.offerings ?? []) add(o, f.replace(".json", ""));
}
// API adapters write `offerings` per file (aws/azure) or fixed ids
const API_FIXED = {
  "akamai-linode.json": ["vps:akamai-linode:shared-cpu", "object:akamai-linode:object-storage"], "vultr.json": ["vps:vultr:cloud-compute"],
  "oracle-cloud.json": ["vps:oracle-cloud:compute"], "scaleway.json": ["vps:scaleway:instances", "object:scaleway:object-storage"],
};
for (const f of readdirSync(D + "pending").filter((f) => f.endsWith(".json"))) {
  const ids = API_FIXED[f] ?? JSON.parse(readFileSync(D + "pending/" + f, "utf8").slice(0, 4000).match(/"offerings":(\[[^\]]*\])/)?.[1] ?? "[]");
  for (const o of ids) add(o, "api:" + f.replace(".json", ""));
}
const real = OFFERINGS.filter((o) => o.provider !== "Self-hosted");
const missing = real.filter((o) => !covered.has(o.id));
console.log(`offerings (excluding self-hosted rows): ${real.length}, with at least one captured price: ${real.length - missing.length}, without: ${missing.length}`);
const byProv = {};
for (const o of missing) (byProv[o.provider] ??= []).push(o.product);
if (process.argv.includes("--list")) for (const [p, l] of Object.entries(byProv).sort()) console.log(`${p}: ${l.join("; ")}`);
else console.log(`providers with gaps: ${Object.keys(byProv).length}`);

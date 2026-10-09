import { raw, tables, num, gib, write } from "./lib.mjs";

write("mongodb", [
  { offerings: ["mongodb:mongodb:atlas"], tier: "Free", spec: { storageGb: 0.5, cpu: "shared", ram: "shared" }, price: { amount: 0, unit: "month" } },
  { offerings: ["mongodb:mongodb:atlas"], tier: "Flex", spec: { storageGb: 5, cpu: "shared", ram: "shared" }, price: { amount: 30, unit: "month", note: "'Up to $30/month'; billed $0.011/hour until the cap" }, hourly: 0.011 },
  { offerings: ["mongodb:mongodb:atlas"], tier: "Dedicated (from M10)", spec: { storageGbRange: "10 GB to 4 TB", ramGbRange: "2 to 768", vcpuRange: "2 to 96", vcpu: 2, ramGb: 2, storageGb: 10 }, price: { amount: 56.94, unit: "month", note: "'Starts at'" }, hourly: 0.08 },
  ...tables(raw("mongodb", 1)).filter((t) => t.headers.includes("Cluster Tier")).flatMap((t) => t.rows.map((r) => { const bp = num(r[t.headers.find((h) => h.startsWith("Base Price"))]); return ({ offerings: ["vector:mongodb:atlas-vector-search"], tier: `Search node ${r["Cluster Tier"]}`, spec: { vcpu: num(r.vCPUs), ramGb: gib(r.RAM), storageGb: gib(r.Storage) }, hourly: bp, price: { amount: Math.round(bp * 730 * 100) / 100, unit: "month", note: "hourly x 730" } }); })),
], { notes: "Atlas Infinite (public preview) is listed at $0.09/hour; not exported. Dedicated tiers beyond the 'from' price are in an interactive calculator, not on the page." });

write("turso", [
  { offerings: ["sqlite:turso:libsql"], tier: "Free", spec: {}, price: { amount: 0, unit: "month" } },
  { offerings: ["sqlite:turso:libsql"], tier: "Developer", spec: {}, price: { amount: 4.99, unit: "month" } },
  { offerings: ["sqlite:turso:libsql"], tier: "Scaler", spec: {}, price: { amount: 24.92, unit: "month" } },
  { offerings: ["sqlite:turso:libsql"], tier: "Pro", spec: {}, price: { amount: 416.58, unit: "month" } },
], { notes: "Plan limits (storage 5/9/24/50 GB, rows read/written, overage per GB / billion rows) appear on the page without column labels in the scrape, so they are NOT recorded to avoid mislabelling." });

write("timescale", [
  { offerings: ["timeseries:timescale:cloud"], tier: "Performance", spec: { cpuMax: 8, ramGbMax: 32, diskTbMax: 16, iopsMax: 5000 }, price: { amount: 30, unit: "month", note: "compute starts at" }, rates: [{ name: "storage", amount: 0.177, unit: "gb-month" }] },
  { offerings: ["timeseries:timescale:cloud"], tier: "Scale", spec: { cpuMax: 32, ramGbMax: 128, diskTbMax: 64, iopsMax: 40000 }, price: { amount: 36, unit: "month", note: "compute starts at" }, rates: [{ name: "storage", amount: 0.212, unit: "gb-month" }] },
], { notes: "Vendor is now Tiger Data. Enterprise tier is contact-sales. A third spec column (up to 64 CPU / 256 GB) is Enterprise." });

// TiDB Cloud dedicated: node tables, price per hour, node role = first column of the group
const ti = [];
let role = "TiDB";
for (const r of tables(raw("tidb", 1))[0].rows.filter((r) => num(Object.values(r).at(-1)) !== undefined)) {
  const v = Object.values(r);
  if (/^(TiDB|TiKV|TiFlash|TiProxy)$/.test(v[0])) role = v[0];
  const size = /^(TiDB|TiKV|TiFlash|TiProxy)$/.test(v[0]) ? v[1] : v[0];
  const price = num(/^(TiDB|TiKV|TiFlash|TiProxy)$/.test(v[0]) ? v[2] : v[1]);
  const m = size.match(/(\d+) vCPU, (\d+) GiB/);
  ti.push({ offerings: ["newsql:tidb:cloud", "mysql:tidb:cloud"], tier: `${role} node ${size}`, spec: { role, vcpu: m ? +m[1] : undefined, ramGb: m ? +m[2] : undefined, size: m ? undefined : size }, price: { amount: Math.round(price * 730 * 100) / 100, unit: "month", note: "hourly x 730" }, hourly: price });
}
write("tidb", ti, { notes: "TiDB Cloud Dedicated node prices (compute/hour); a cluster needs TiDB + TiKV nodes (+ TiFlash optionally). Serverless/Starter tiers not captured on this page." });

import { raw, tables, num, gib, write } from "./lib.mjs";

// --- Heroku
const T = tables(raw("heroku", 1));
const hk = [];
const dynoOff = ["app:heroku:dynos", "paas:heroku:platform"];
for (const r of T[0].rows) hk.push({ offerings: dynoOff, tier: `${r["Dyno Type"]} dyno`, spec: { ramGb: gib(r.RAM), compute: r.Compute, privateSpaceOnly: r["Requires Private Space"] === "Yes" }, price: { amount: num(r["Price / Month"]), unit: "month" } });
for (const r of T[1].rows) hk.push({ offerings: dynoOff, tier: `${r["Dyno Type"]} dyno`, spec: { vcpu: num(r.vCPUs), ramGb: gib(r.RAM), family: r["Dyno Family"], privateSpaceOnly: r["Requires Private Space"] === "Yes" }, price: { amount: num(r["Price / Month"]), unit: "month" } });
for (const t of [T[2], T[3]]) for (const r of t.rows) hk.push({ offerings: ["postgres:heroku:postgres"], tier: `Postgres ${r["Plan Name"]}`, spec: { ramGb: /bytes/i.test(r.RAM) ? undefined : gib(r.RAM), sharedRam: /bytes/i.test(r.RAM) || undefined, diskGb: gib(r["Disk Size"]), maxConnections: num(r["Connection Limit"]), privateSpaceOnly: r["Requires Private Space"] === "Yes" || undefined }, price: { amount: num(r["Price / Month"]), unit: "month" } });
for (const r of T[5].rows) if (num(r["Price / Month"]) !== undefined) hk.push({ offerings: ["redis:heroku:key-value-store"].filter(() => false), tier: `Key-Value ${r["Plan Name"]}`, spec: { ramMb: num(r.RAM), maxConnections: num(r["Connection Limit"]) }, price: { amount: num(r["Price / Month"]), unit: "month" } });
write("heroku", hk.filter((t) => t.offerings.length && t.price.amount !== undefined), { notes: "Key-Value Store plans are on the page but have no catalog offering to attach to, so they are not exported." });

// --- Fly.io: preset table + rates
const fly = [];
let cpuType = "shared-cpu-1x";
for (const t of tables(raw("fly-io", 1))) {
  if (!t.headers.includes("Preset")) continue;
  for (const r of t.rows) {
    const v = Object.values(r); // continuation rows (only RAM + 3 prices) are shifted left, so read by position
    const cont = /^\d+(\.\d+)?\s?(MB|GB)$/i.test(v[0]);
    if (!cont) cpuType = v[0];
    const ram = cont ? v[0] : v[2];
    const [perHour, perMonth] = cont ? [v[2], v[3]] : [v[4], v[5]];
    if (num(perMonth) === undefined) continue;
    fly.push({ offerings: ["app:fly-io:machines", "containers:fly-io:machines"], tier: `${cpuType} / ${ram}`, spec: { cpuPreset: cpuType, vcpu: num(cpuType.match(/(\d+)x/)?.[1]), cpuKind: cpuType.split("-")[0], ramGb: gib(ram) }, price: { amount: num(perMonth), unit: "month" }, hourly: num(perHour) });
  }
}
fly.push({ offerings: ["app:fly-io:machines", "containers:fly-io:machines"], tier: "Shared rates", spec: {}, rates: [{ name: "extra RAM", amount: 6, unit: "gb-month" }, { name: "volume", amount: 0.15, unit: "gb-month" }, { name: "volume snapshot", amount: 0.08, unit: "gb-month" }, { name: "outbound NA/EU", amount: 0.02, unit: "gb" }, { name: "outbound APAC/SA", amount: 0.04, unit: "gb" }, { name: "outbound Africa/India", amount: 0.12, unit: "gb" }, { name: "dedicated IPv4", amount: 2, unit: "month" }] });
fly.push({ offerings: ["paas:fly-io:platform"], tier: "Managed Postgres: Basic", spec: {}, price: { amount: 38, unit: "month" }, rates: [{ name: "storage", amount: 0.28, unit: "gb-month" }], note: "Page: $38/mo (Basic) up to $1,922/mo (Performance)." });
write("fly-io", fly, { notes: "Prices listed are for the default region; Fly lists higher prices in some regions (e.g. 1 GB machine $7.73 Frankfurt, $8.50 Singapore)." });

// --- Northflank: usage rates, GPUs, fixed container sizes (per month)
write("northflank", [
  { offerings: ["paas:northflank:platform"], tier: "Usage rates", spec: {}, rates: [{ name: "vCPU", amount: 0.01667, unit: "vcpu-hour" }, { name: "memory", amount: 0.00833, unit: "gb-ram-hour" }, { name: "network egress", amount: 0.06, unit: "gb" }, { name: "SSD storage", amount: 0.15, unit: "gb-month" }] },
  ...[["NVIDIA L4 24GB", 0.8], ["NVIDIA A100 40GB", 1.42], ["NVIDIA A100 80GB", 1.76], ["NVIDIA H100 80GB", 2.74], ["NVIDIA RTX PRO 6000 96GB", 3]].map(([n, p]) => ({ offerings: ["paas:northflank:platform"], tier: n, spec: { gpuModel: n }, price: { amount: p, unit: "hour" } })),
], { notes: "Fixed-size container plans exist on the page ($2.70/mo for 256 MB up) but their CPU labels were not captured; per-vCPU/GB rates above are enough to price any size." });

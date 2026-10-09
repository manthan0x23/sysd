import { raw, tables, num, gib, write } from "./lib.mjs";

const [web, pg, kv, cron, wf] = tables(raw("render", 1));
const tiers = [];
const cpuOf = (s) => (/less than 1|up to 1/i.test(s) ? 0.5 : num(s));

for (const r of web.rows) {
  const v = Object.values(r);
  tiers.push({ offerings: ["app:render:web-services", "paas:render:platform", "worker:render:background-workers"], tier: `${v[0]} / ${v[2]} (${v[3]})`.replace("( limitations apply)", ""), spec: { vcpu: cpuOf(v[0]), ramGb: gib(v[2]), plan: v[3] }, price: { amount: num(v[1]), unit: "month" } });
}
for (const r of pg.rows) {
  const v = Object.values(r);
  tiers.push({ offerings: ["postgres:render:postgres"], tier: `Postgres ${v[0]} / ${v[2]}`, spec: { vcpu: cpuOf(v[0]), ramGb: gib(v[2]), maxConnections: num(v[3]), plan: v[4] }, price: { amount: num(v[1]), unit: "month" } });
}
for (const r of kv.rows) {
  const v = Object.values(r);
  tiers.push({ offerings: ["redis:render:key-value"], tier: `Key Value ${v[2]}`, spec: { ramGb: gib(v[2]), storageGb: v[3] === "--" ? undefined : gib(v[3]), maxConnections: num(v[4]), plan: v[5] }, price: { amount: num(v[1]), unit: "month" } });
}
for (const r of cron.rows) {
  const v = Object.values(r);
  tiers.push({ offerings: ["worker:render:background-workers"], tier: `Cron job ${v[0]} / ${v[2]}`, spec: { vcpu: cpuOf(v[0]), ramGb: gib(v[2]), plan: v[3] }, price: { amount: num(v[1]), unit: "minute" }, note: "Billed per minute while the job runs." });
}
for (const r of wf.rows) {
  const v = Object.values(r);
  if (/active cpu hour/i.test(v[1])) { tiers.push({ offerings: ["worker:render:background-workers"], tier: "Workflow task: flex", spec: { vcpu: 1, ramGb: 4 }, rates: [{ name: "active CPU", amount: 0.2, unit: "vcpu-hour" }, { name: "active memory", amount: 0.05, unit: "gb-ram-hour" }] }); continue; }
  tiers.push({ offerings: ["worker:render:background-workers"], tier: `Workflow task ${v[0]} / ${v[2]}`, spec: { vcpu: cpuOf(v[0]), ramGb: gib(v[2]), plan: v[3] }, price: { amount: num(v[1]), unit: "hour" } });
}
// workspace plans and shared rates
for (const [n, p, bw] of [["Hobby", 0, 5], ["Pro", 25, 25], ["Scale", 499, 1024]]) tiers.push({ offerings: ["paas:render:platform"], tier: `Workspace: ${n}`, spec: { bandwidthIncludedGb: bw }, price: { amount: p, unit: "month" } });
tiers.push({ offerings: ["paas:render:platform", "app:render:web-services"], tier: "Shared rates", spec: {}, rates: [{ name: "bandwidth over included", amount: 0.15, unit: "gb" }, { name: "persistent disk", amount: 0.25, unit: "gb-month" }] });
write("render", tiers, { notes: "Workspace plan names/prices read from the three header prices ($0 / $25 / $499); confirm per-seat status on the page before billing logic relies on it." });

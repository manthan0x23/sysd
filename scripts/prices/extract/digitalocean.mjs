import { raw, tables, num, gib, write } from "./lib.mjs";

const tiers = [];
const mk = (offerings, label, r, { cpu = "vCPU", mem = "Memory", disk = "SSD", xfer = "Transfer", hr = "$/hr", mo = "$/mo", extra } = {}) => ({
  offerings, tier: label,
  spec: { vcpu: num(r[cpu]), ramGb: gib(r[mem]), ...(r[disk] && !/range/i.test(r[disk]) ? { diskGb: gib(r[disk]) } : {}), ...(r[xfer] ? { transferGb: gib(r[xfer]) } : {}), ...extra },
  price: { amount: num(r[mo]), unit: "month" }, hourly: num(r[hr]),
});

// 1. Droplets: 5 tables (Basic, General Purpose, CPU-Optimized, Memory-Optimized, Storage-Optimized), in page order
const d1 = tables(raw("digitalocean", 1)).filter((t) => t.headers.includes("$/mo"));
d1.forEach((t) => t.rows.forEach((r) => tiers.push(mk(["vps:digitalocean:droplets"], `${t.section.replace(" Droplets", "")} ${r.Memory} / ${r.vCPU}`, r, { extra: { family: t.section.replace(" Droplets", ""), ssdVariant: r["SSD Variant"] } }))));

// 2. App Platform containers
for (const r of tables(raw("digitalocean", 2)).flatMap((t) => t.rows).filter((r) => r["$/mo"] && r.vCPU)) {
  tiers.push({ offerings: ["app:digitalocean:app-platform", "containers:digitalocean:app-platform"], tier: `${r["CPU Type"].split("<br>")[0].trim()} ${r.vCPU} / ${r.Memory}`, spec: { vcpu: num(r.vCPU), ramGb: gib(r.Memory), transferGb: gib(r.Transfer), autoscaling: r.Autoscaling === "Yes" }, price: { amount: num(r["$/mo"]), unit: "month" } });
}

// 3. Managed databases (page 3): section name -> offering
const dbOffer = { "PostgreSQL Standard": "postgres:digitalocean:managed-postgresql", "MySQL Standard": "mysql:digitalocean:managed-mysql", MongoDB: "mongodb:digitalocean:managed-mongodb", Valkey: "redis:digitalocean:managed-valkey" };
const seen = new Set();
for (const t of tables(raw("digitalocean", 3))) {
  const off = dbOffer[t.section];
  if (!off) continue;
  t.rows.forEach((r, i) => {
    const key = `${off}|${r.Memory}|${r.vCPUs}|${r["$/mo"]}|${i}`;
    if (seen.has(key.slice(0, key.lastIndexOf("|")))) return;
    seen.add(key.slice(0, key.lastIndexOf("|")));
    tiers.push({ offerings: [off], tier: `${t.section} ${r.Memory} / ${r.vCPUs}`, spec: { vcpu: num(r.vCPUs), ramGb: gib(r.Memory), diskNote: r.Disk }, price: { amount: num(r["$/mo"]), unit: "month" }, hourly: num(r["$/hr"]) });
  });
}

// 4. Kubernetes (DOKS): control plane free, nodes are Droplets; HA control plane $40/month
tiers.push({ offerings: ["k8s:digitalocean:doks"], tier: "Control plane (standard)", spec: {}, price: { amount: 0, unit: "month" } });
tiers.push({ offerings: ["k8s:digitalocean:doks"], tier: "Control plane (high availability)", spec: {}, price: { amount: 40, unit: "month" } });
tiers.push({ offerings: ["k8s:digitalocean:doks"], tier: "Worker node: Basic 2 GiB / 1 vCPU", spec: { vcpu: 1, ramGb: 2 }, price: { amount: 12, unit: "month" }, note: "Nodes are billed as Droplets; $12/mo is the smallest node on the DOKS page." });

// 5. Load balancer, volumes, Spaces
tiers.push({ offerings: ["lb:digitalocean:load-balancers"], tier: "Regional load balancer (per node)", spec: {}, price: { amount: 12, unit: "month" }, note: "Add up to 100 nodes; each node adds capacity." });
tiers.push({ offerings: ["block:digitalocean:volumes"], tier: "Volume (block storage)", spec: {}, rates: [{ name: "storage", amount: 0.10, unit: "gb-month" }, { name: "snapshot", amount: 0.06, unit: "gb-month" }], note: "100 GiB = $10, 500 GiB = $50, 1,000 GiB = $100." });
tiers.push({ offerings: ["object:digitalocean:spaces"], tier: "Spaces", spec: { includedStorageGb: 250, includedTransferGb: 1024 }, price: { amount: 5, unit: "month" }, rates: [{ name: "extra storage", amount: 0.02, unit: "gb-month" }, { name: "extra transfer", amount: 0.01, unit: "gb" }, { name: "cold storage", amount: 0.007, unit: "gb-month" }] });
tiers.push({ offerings: ["egress:digitalocean:bandwidth"], tier: "Outbound transfer overage", spec: {}, rates: [{ name: "overage", amount: 0.01, unit: "gb" }], note: "Droplets include 500 GiB to 10 TiB depending on size; App Platform overage is $0.02/GiB." });
write("digitalocean", tiers, { notes: "Prices as listed on the pages; hourly price in `hourly`." });

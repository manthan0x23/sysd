// Contabo, OVHcloud, UpCloud: read from the scraped pages (see data/prices/raw).
import { raw, tables, num, gib, write, vps } from "./lib.mjs";

// --- Contabo: 24-month term, USD, excluding VAT. Page shows the VAT-inclusive figure too.
const contabo = [["4", 4, 8, "100 GB SSD", 5.28], ["6", 6, 12, "200 GB SSD / 100 GB NVMe", 7.2], ["8", 8, 24, "300 GB SSD / 150 GB NVMe", 13.44], ["12", 12, 48, "400 GB SSD / 200 GB NVMe", 24], ["16", 16, 64, "500 GB SSD / 250 GB NVMe", 35.6], ["18", 18, 96, "600 GB SSD / 300 GB NVMe", 47.04]];
write("contabo", contabo.map(([n, c, r, d, p]) => vps("vps:contabo:cloud-vps", `Cloud VPS ${n}`, c, r, num(d), p, { diskNote: d, note: "Price excludes VAT and is for a 24-month term." })), { notes: "The page quotes each plan as 'x (incl. VAT)' and 'y excluding VAT'; the ex-VAT figure is recorded. Only the larger Cloud VPS sizes are on this page." });

// --- OVHcloud VPS: "From $x /month" cards
const ovh = [[2, 4, 40, 4.54, "500 Mbps"], [4, 8, 75, 8.5, "1 Gbps"], [6, 12, 100, 12.32, "2 Gbps"], [8, 24, 200, 23.37, "3 Gbps"]];
const k8s = { offerings: ["k8s:ovhcloud:managed-kubernetes"], tier: "Standard control plane", spec: { dedicatedEtcdGb: 8, maxNodes: 500 }, rates: [{ name: "control plane", amount: 0.099, unit: "hour" }] };
write("ovhcloud", [...ovh.map(([c, r, d, p, bw]) => vps("vps:ovhcloud:vps", `VPS ${c} vCores / ${r} GB`, c, r, d, p, { diskType: "NVMe", bandwidth: bw, note: "'From' price on the page." })), { offerings: ["k8s:ovhcloud:managed-kubernetes"], tier: "Free control plane", spec: { etcdMb: 400, maxNodes: 100 }, price: { amount: 0, unit: "month" } }, k8s]);

// --- UpCloud: EUR. Tables in order: Starter (general purpose), Premium (MaxIOPS), Cloud Native
const up = tables(raw("upcloud", 1));
const upTiers = [];
const group = ["Starter", "Premium", "Cloud Native"];
up.slice(0, 3).forEach((t, i) => t.rows.forEach((r) => upTiers.push(vps("vps:upcloud:cloud-servers", `${group[i]} ${r.Memory} / ${r["CPU cores"]} CPU`, num(r["CPU cores"]), gib(r.Memory), r.Storage ? gib(r.Storage) : r.MaxIOPS ? gib(r.MaxIOPS) : undefined, num(r.Price), { family: group[i], ...(r.Bandwidth ? { bandwidth: r.Bandwidth } : {}) }))));
write("upcloud", upTiers, { currency: "EUR", notes: "Prices are in EUR as listed; transfer is zero-cost." });

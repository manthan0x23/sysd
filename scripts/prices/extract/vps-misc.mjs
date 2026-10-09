// Cloudways (card regex), Kamatera (hand-typed from the 3 cards + type B line).
import { raw, tables, num, write, vps } from "./lib.mjs";

const cw = [];
const seen = new Set();
for (const m of raw("cloudways", 1).matchAll(/## \$(\d+)\s+USD per month\s+You pay \$([\d.]+) hourly\s+-\s+\*\*(\d+)GB\*\* RAM\s+-\s+\*\*(\d+) vCPU\*\*\s+-\s+\*\*(\d+)GB(?: NVMe)?\*\* Storage\s+-\s+\*\*(\d+)TB\*\* Transfer/g)) {
  if (seen.has(m[1])) continue;
  seen.add(m[1]);
  cw.push(vps("vps:cloudways:managed-cloud-servers", `${m[3]} GB / ${m[4]} vCPU`, +m[4], +m[3], +m[5], +m[1], { hourly: +m[2], transferGb: +m[6] * 1000 }));
}
write("cloudways", cw, { notes: "Managed hosting layer on top of DigitalOcean/Vultr/AWS/GCP; the page lists the 'Flexible' plan sizes. Price includes the Cloudways management fee." });

write("kamatera", [
  vps("vps:kamatera:cloud-servers", "Type A: 1 vCPU / 1 GB / 20 GB NVMe", 1, 1, 20, 4, { transferGb: 5000 }),
  vps("vps:kamatera:cloud-servers", "Type A: 2 vCPU / 2 GB / 20 GB NVMe", 2, 2, 20, 25, { transferGb: 5000 }),
  vps("vps:kamatera:cloud-servers", "Type A: 2 vCPU / 4 GB / 20 GB NVMe", 2, 4, 20, 39, { transferGb: 5000 }),
], { notes: "Page labels only 'Type B - General Purpose' explicitly ($10/mo, 512 MB RAM / 5 GB, $0.014/hr). Pricing is configurable per resource; extra traffic $0.01/GB, extra storage $0.05/GB-month. The 'Type A' labels above are mine for the three unlabelled cards." });

// --- Liquid Web (cards)
write("liquid-web", [[5, null, 1, 1, 30, 1], [8.5, 17, 2, 4, 80, 3], [22.5, 45, 4, 8, 240, 5], [45, 90, 6, 16, 440, 7]].map(([p, was, c, r, d, bw]) => vps("vps:liquid-web:vps", `${r} GB RAM`, c, r, d, was ?? p, { transferGb: bw * 1000, ...(was ? { introPrice: { amount: p, unit: "month", note: "promo; struck-through regular price recorded as price" } } : {}) })), { notes: "Struck-through price taken as regular. 1 GB plan shows only $5/mo. 10 Gbps network." });

// --- E2E Networks: INR-free USD tables. GPU tables are per GPU-hour.
const e2e = tables(raw("e2e-networks", 1));
const e2eTiers = [];
for (const t of e2e) {
  if (t.headers.includes("GPU")) for (const r of t.rows) e2eTiers.push({ offerings: ["vps:e2e-networks:cloud-compute"], tier: `${r.GPU} ${r.vRAM} GB`, spec: { gpuModel: r.GPU, vramGb: num(r.vRAM), vcpu: num(r.vCPUs), ramGb: num(r["RAM, GB"]) }, price: { amount: num(r["Hourly/On-Demand"]), unit: "hour" }, note: "Per GPU-hour, on-demand; monthly/annual by quote." });
  else if (t.headers.includes("Plan") && !/dbaas/i.test(t.section)) for (const r of t.rows.filter((r) => num(r.Monthly) !== undefined)) e2eTiers.push(vps("vps:e2e-networks:cloud-compute", `${t.section}: ${r.Plan}`, num(r.vCPUs), num(r["Dedicated RAM, GB"]), num(r["Disk Space (NVMe SSD)"]), num(r.Monthly), { hourly: num(r["Hourly/On-Demand"]), family: t.section }));
}
write("e2e-networks", e2eTiers);

// --- Alibaba Cloud ECS: China (Hong Kong), Linux. List price = pay-as-you-go hourly; list monthly price.
const aliSeen = new Set();
const ali = tables(raw("alibaba-cloud", 1)).flatMap((t) => t.rows).filter((r) => /ecs\./.test(r["Instance Type"] ?? "") && num(r["List Price (monthly pay)"]) !== undefined && !aliSeen.has(r["Instance Type"]) && aliSeen.add(r["Instance Type"]));
write("alibaba-cloud", ali.map((r) => { const id = r["Instance Type"].split(" ").pop(); return vps("vps:alibaba-cloud:ecs", id, num(r.vCPUs), num(r["MEM (GiB)"]), undefined, num(r["List Price (monthly pay)"]), { hourly: num(r["List Price (Pay-as-you-go)"]), region: "China (Hong Kong)", note: "List price, Linux. Discounted prices on the page not recorded (promotional)." }); }), { notes: "Region: China (Hong Kong). The page shows other regions via a selector; only HK was in the scrape." });
write("inmotion-hosting", [], { notes: "Scrape returned only a blocked-script page; no prices captured. Re-fetch with a different URL needed." });

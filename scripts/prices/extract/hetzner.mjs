// Hetzner Cloud: prices from the official price-adjustment doc (Germany/Finland section, NEW prices, excl. IPv4),
// specs from the cost-optimized / regular-performance / general-purpose product pages.
import { raw, num, write, vps } from "./lib.mjs";

const specs = {};
for (const n of [2, 3, 4]) {
  for (const m of raw("hetzner", n).matchAll(/\n([A-Z]{2,3}\d{2})\n+(?:not available\n+)?(\d+)\n+([^\n]+)\n+(\d+) GB\n+(\d+) GB\n+(NVMe|SSD)\n/g)) {
    specs[m[1]] ??= { vcpu: +m[2], cpu: m[3].trim(), ramGb: +m[4], diskGb: +m[5], diskType: m[6] };
  }
}
const md = raw("hetzner", 1);
const eu = md.split(/### \[germany/i)[1]?.split(/### \[usa/i)[0] ?? "";
const tiers = [];
for (const line of eu.split("\n")) {
  const c = line.split("|").map((x) => x.trim());
  if (c.length < 7 || !/^[A-Z]{2,3}\d{2}$/.test(c[1])) continue;
  const [hrEur, moEur] = c[3].split("/").map(num), [hrUsd, moUsd] = c[5].split("/").map(num);
  const s = specs[c[1]];
  tiers.push(vps("vps:hetzner:cloud-servers", c[1], s?.vcpu, s?.ramGb, s?.diskGb, moUsd, { hourly: hrUsd, eurMonthly: moEur, eurHourly: hrEur, cpuKind: s?.cpu, diskType: s?.diskType, region: "FSN/NBG/HEL", note: "New prices from 15 June 2026, excl. IPv4 (€0.50/mo extra). 20 TB traffic included in EU." }));
}
write("hetzner", tiers, { sources: ["https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/", "https://www.hetzner.com/cloud/cost-optimized/", "https://www.hetzner.com/cloud/regular-performance/", "https://www.hetzner.com/cloud/general-purpose/"], notes: "Prices in USD as Hetzner lists them for the EU region (EUR monthly in eurMonthly). Specs matched by model name; tiers with no spec match have undefined vCPU/RAM. US and Singapore prices differ (dedicated vCPU CCX/CPX much higher) and are not exported. Volumes, load balancers and object storage prices not captured." });

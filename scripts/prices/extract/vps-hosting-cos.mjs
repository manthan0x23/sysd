// Bluehost, GoDaddy, Namecheap, IONOS, HostGator: web-hosting companies' VPS plans. Price = regular/renewal rate; introPrice = first-term promo.
import { write, vps } from "./lib.mjs";
const intro = (amount, note) => ({ amount, unit: "month", note });

write("bluehost", [
  vps("vps:bluehost:vps", "NVMe 2", 1, 2, 50, 5.69, { introPrice: intro(4.69, "24-month term"), diskType: "NVMe" }),
  vps("vps:bluehost:vps", "NVMe 4", 2, 4, 100, 11.99, { introPrice: intro(9.49, "24-month term"), diskType: "NVMe" }),
  vps("vps:bluehost:vps", "NVMe 8", 4, 8, 200, 28.99, { introPrice: intro(12.99, "24-month term"), diskType: "NVMe" }),
  vps("vps:bluehost:vps", "NVMe 16", undefined, undefined, undefined, 49.99, { introPrice: intro(25.99, "24-month term"), note: "vCPU/RAM for this size not shown in the scrape." }),
], { notes: "Prices exclude VAT/GST. Unmetered bandwidth." });

write("godaddy", [
  vps("vps:godaddy:vps", "1 vCPU / 2 GB", 1, 2, 40, 14.99, { introPrice: intro(8.99, "promo price"), diskType: "NVMe" }),
  vps("vps:godaddy:vps", "2 vCPU / 4 GB", 2, 4, 100, 29.99, { introPrice: intro(17.99, "promo price"), diskType: "NVMe" }),
  vps("vps:godaddy:vps", "4 vCPU / 8 GB", 4, 8, 200, 59.99, { introPrice: intro(34.99, "promo price"), diskType: "NVMe" }),
  vps("vps:godaddy:vps", "4 vCPU / 16 GB", 4, 16, 200, 74.99, { introPrice: intro(44.99, "promo price"), diskType: "NVMe" }),
], { notes: "Struck-through price taken as the regular price; the promo term length is not on the page." });

write("namecheap", [
  vps("vps:namecheap:vps", "1 CPU / 1 GB", 1, 1, 20, 4.88, { transferGb: 1000, introPrice: intro(3.88, "first year; renews at $58.56/year") }),
  vps("vps:namecheap:vps", "2 CPU / 2 GB", 2, 2, 40, 8.88, { transferGb: 1000, introPrice: intro(6.88, "first year; renews at $106.56/year") }),
  vps("vps:namecheap:vps", "4 CPU / 6 GB", 4, 6, 120, 15.88, { transferGb: 3000, introPrice: intro(12.88, "first year; renews at $190.56/year") }),
  vps("vps:namecheap:vps", "8 CPU / 12 GB", 8, 12, 240, 28.88, { transferGb: 6000, introPrice: intro(24.88, "first year; renews at $346.56/year") }),
], { notes: "Plan names are not on the scraped page, so tiers are labelled by size. Regular price = 'Was' price = renewal/12." });

write("ionos", [["S+", 1, 2, 60, 6, 2], ["M+", 2, 4, 120, 14, 5], ["L+", 4, 8, 240, 25, 8], ["XL+", 8, 16, 480, 47, 14], ["XXL+", 12, 24, undefined, 68, 20]].map(([n, c, r, d, p, i]) => vps("vps:ionos:vps", `VPS ${n}`, c, r, d, p, { diskType: "NVMe", introPrice: intro(i, "first 3 months with a 1-year term") })), { notes: "Regular price derived from the page's own 'Save $x' figure (saving = (regular - promo) x 3 months); promo shown on page." });

write("hostgator", [
  vps("vps:hostgator:vps", "Snappy 1000 (NVMe 2)", 1, 2, 50, 4.95, { introPrice: intro(2.24, "first invoice only; the page also shows $2.09"), diskType: "NVMe" }),
  vps("vps:hostgator:vps", "Snappy 2000 (NVMe 4)", 2, 4, 100, 9.35, { introPrice: intro(4.18, "first invoice only"), diskType: "NVMe" }),
  vps("vps:hostgator:vps", "Snappy 4000 (NVMe 8)", 4, 8, 200, 18.7, { introPrice: intro(8.36, "first invoice only"), diskType: "NVMe" }),
  vps("vps:hostgator:vps", "Snappy 8000 (NVMe 16)", undefined, 16, undefined, 39.53, { introPrice: intro(17.67, "first invoice only"), note: "vCPU/disk for this size not shown in the scrape." }),
], { notes: "Same platform family as Bluehost. Entry-plan price appears twice on the page ($2.09 and $2.24), so treat it as ~$2.2." });

write("a2-hosting", [], { notes: "The scraped URL returned shared-hosting plans (Startup/Drive/Turbo), not VPS tiers. VPS pricing needs a different URL; not recorded." });

// Owner-only spreadsheet of everything captured. Read-only output: DB (later) is the source of truth.
// usage: npx tsx scripts/prices/xlsx.mjs   -> ./prices.xlsx (gitignored)
import ExcelJS from "exceljs";
import { readdirSync, readFileSync } from "node:fs";
import { OFFERING_BY_ID, OFFERINGS } from "../../src/lib/catalog/offerings.ts";
import { TYPE_BY_ID } from "../../src/lib/catalog/services.ts";

const D = new URL("../../data/prices/", import.meta.url).pathname;
const wb = new ExcelJS.Workbook();
wb.creator = "sysd price pipeline";
const COLS = [["Provider", 18], ["Product", 24], ["Offering id", 34], ["Tier / plan", 34], ["vCPU", 8], ["RAM GB", 9], ["Disk GB", 9], ["Price", 11], ["Unit", 11], ["Currency", 9], ["Intro price", 11], ["Hourly", 10], ["Usage rates", 60], ["Notes", 60], ["Source", 40], ["Fetched", 11], ["Status", 9]];
const sheets = new Map();
const sheet = (name) => {
  if (!sheets.has(name)) { const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] }); ws.columns = COLS.map(([h, w]) => ({ header: h, width: w })); ws.getRow(1).font = { bold: true }; ws.autoFilter = { from: "A1", to: { row: 1, column: COLS.length } }; sheets.set(name, ws); }
  return sheets.get(name);
};
const catOf = (offeringId) => TYPE_BY_ID[offeringId.split(":")[0]]?.category ?? "Other";
const rateText = (rates = []) => rates.map((r) => `${r.name}: ${r.amount} ${r.unit}`).join("; ");
let rows = 0;

// 1. Hand/auto-extracted tiers
const sources = [];
for (const f of readdirSync(D + "extracted").filter((f) => f.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(D + "extracted/" + f, "utf8"));
  sources.push([d.provider, d.currency, d.fetchedAt, (d.sources ?? []).join("  "), d.tiers.length, d.notes ?? ""]);
  for (const t of d.tiers) for (const o of t.offerings) {
    const off = OFFERING_BY_ID[o];
    sheet(catOf(o)).addRow([off?.provider ?? d.provider, off?.product ?? "", o, t.tier, t.spec?.vcpu, t.spec?.ramGb, t.spec?.diskGb, t.price?.amount ?? (t.contact ? "contact" : ""), t.price?.unit ?? "", d.currency, t.introPrice?.amount, t.hourly, rateText(t.rates), t.note ?? "", (d.sources ?? [])[0] ?? "", d.fetchedAt, "pending"]);
    rows++;
  }
}
// 2. API tier files (Linode, Vultr, Scaleway): one row per instance type
const apiOff = { "akamai-linode": { compute: "vps:akamai-linode:shared-cpu", storage: "object:akamai-linode:object-storage" }, vultr: { compute: "vps:vultr:cloud-compute" }, scaleway: { compute: "vps:scaleway:instances" } };
for (const p of Object.keys(apiOff)) {
  const d = JSON.parse(readFileSync(`${D}pending/${p}.json`, "utf8"));
  sources.push([p, d.tiers[0]?.currency ?? "USD", d.fetchedAt.slice(0, 10), d.tiers[0]?.api ?? "", d.tiers.length, d.note ?? ""]);
  for (const t of d.tiers) {
    const o = apiOff[p][t.offering.split(":")[0]] ?? Object.values(apiOff[p])[0];
    const off = OFFERING_BY_ID[o];
    sheet(catOf(o)).addRow([off?.provider ?? p, off?.product ?? "", o, `${t.label} (${t.offering})`, t.spec?.vcpu, t.spec?.ramGb, t.spec?.diskGb, t.price?.amount ?? "", t.price?.unit ?? "", t.currency, "", t.price?.hourly, "", "", t.api, d.fetchedAt.slice(0, 10), "pending"]);
    rows++;
  }
}
// 3. Big flat rate lists: AWS, Azure, Oracle, Scaleway catalog
const rate = wb.addWorksheet("API rates (AWS-Azure-Oracle)", { views: [{ state: "frozen", ySplit: 1 }] });
rate.columns = [["Provider", 14], ["Service", 28], ["Offering ids", 40], ["Family / product", 30], ["Description / usage type", 70], ["Attributes (vCPU, memory, engine...)", 60], ["Unit", 14], ["Price", 14], ["Currency", 9], ["Region", 14], ["Fetched", 11], ["Status", 9]].map(([header, width]) => ({ header, width }));
rate.getRow(1).font = { bold: true };
rate.autoFilter = { from: "A1", to: { row: 1, column: 12 } };
const attrText = (a = {}) => ["instanceType", "vcpu", "memory", "storage", "databaseEngine", "deploymentOption", "cacheEngine", "volumeType", "storageClass", "gpu", "operatingSystem", "tenancy"].filter((k) => a[k]).map((k) => `${k}=${a[k]}`).join(", ");
for (const f of readdirSync(D + "pending")) {
  if (!f.startsWith("aws__") && !f.startsWith("azure__") && f !== "oracle-cloud.json" && f !== "scaleway.json") continue;
  const d = JSON.parse(readFileSync(D + "pending/" + f, "utf8"));
  const offs = (d.offerings ?? []).join(", ");
  if (f.startsWith("aws__")) { sources.push([`aws/${d.service}`, "USD", d.fetchedAt.slice(0, 10), d.source, d.count, `price list ${d.priceListVersion ?? ""}`]); for (const r of d.rates) { rate.addRow(["AWS", d.service, offs, r.family ?? "", r.description?.slice(0, 200) ?? r.usagetype, attrText(r.attrs), r.unit, r.usd, "USD", "us-east-1", d.fetchedAt.slice(0, 10), "pending"]); rows++; } }
  else if (f.startsWith("azure__")) { sources.push([`azure/${d.service}`, "USD", d.fetchedAt.slice(0, 10), d.source, d.count, ""]); for (const r of d.rates) { rate.addRow(["Microsoft Azure", d.service, offs, r.product, `${r.sku} / ${r.meter}`, r.armSku ?? "", r.unit, r.usd, "USD", r.region, d.fetchedAt.slice(0, 10), "pending"]); rows++; } }
  else if (f === "oracle-cloud.json") { sources.push(["oracle-cloud", "USD", d.fetchedAt.slice(0, 10), d.api, d.rates.length, ""]); for (const r of d.rates) { rate.addRow(["Oracle Cloud", r.category, offs, r.product, r.partNumber, r.model, r.unit, r.usd, "USD", "global", d.fetchedAt.slice(0, 10), "pending"]); rows++; } }
  else { sources.push(["scaleway/catalog", "EUR", d.fetchedAt.slice(0, 10), "https://api.scaleway.com/product-catalog/v2alpha1/public-catalog/products", d.rates.length, ""]); for (const r of d.rates) { rate.addRow(["Scaleway", r.category, "", r.product, r.description, r.productCategory, r.unit, r.eur, "EUR", "fr-par", d.fetchedAt.slice(0, 10), "pending"]); rows++; } }
}
// 4. Sources and gaps
const src = wb.addWorksheet("Sources");
src.columns = ["Provider", "Currency", "Fetched", "Source URL(s)", "Tiers/rates", "Notes"].map((header, i) => ({ header, width: [22, 9, 11, 80, 12, 90][i] }));
src.getRow(1).font = { bold: true };
for (const s of sources) src.addRow(s);
const have = new Set();
wb.eachSheet((ws) => { if (!["Sources", "Gaps"].includes(ws.name) && !ws.name.startsWith("API")) ws.eachRow((r, i) => { if (i > 1) have.add(r.getCell(3).value); }); });
for (const f of readdirSync(D + "pending")) { if (f.startsWith("aws__") || f.startsWith("azure__")) for (const o of JSON.parse(readFileSync(D + "pending/" + f, "utf8").slice(0, 3000).match(/"offerings":(\[[^\]]*\])/)?.[1] ?? "[]")) have.add(o); }
for (const o of ["vps:oracle-cloud:compute", "object:scaleway:object-storage"]) have.add(o);
const gaps = wb.addWorksheet("Gaps");
gaps.columns = ["Provider", "Product", "Offering id", "Model"].map((header, i) => ({ header, width: [22, 34, 44, 14][i] }));
gaps.getRow(1).font = { bold: true };
for (const o of OFFERINGS.filter((o) => o.provider !== "Self-hosted" && !have.has(o.id))) gaps.addRow([o.provider, o.product, o.id, o.model]);
await wb.xlsx.writeFile(new URL("../../prices.xlsx", import.meta.url).pathname);
console.log(`prices.xlsx written: ${rows} rows, sheets: ${wb.worksheets.map((w) => `${w.name} (${w.rowCount - 1})`).join(", ")}`);

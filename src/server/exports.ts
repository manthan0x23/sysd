import ExcelJS from "exceljs";
import { breakdown } from "@/lib/breakdown";
import type { DesignDoc } from "@/lib/doc";
import { TYPE_BY_ID } from "@/lib/catalog";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 2 : 0 })}`;

/** Spreadsheet apps run text that starts with = + - @ as a formula, so a service name must not. */
const safe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

export function csv(doc: DesignDoc) {
  const { rows } = breakdown(doc);
  const head = ["Component", "Service", "Provider", "Plan", "Req/s", "Cost/mo (USD)", "Share of cost", "$ per 1M req", "Load", "Basis"];
  const q = (v: string | number) => `"${safe(String(v)).replace(/"/g, '""')}"`;
  return [head, ...rows.map((r) => [r.name, r.service, r.provider, r.plan, Math.round(r.reqPerSec), r.cost.toFixed(2), (r.share * 100).toFixed(1) + "%", r.perMillion?.toFixed(2) ?? "", r.util == null ? "" : Math.round(r.util * 100) + "%", r.basis])]
    .map((l) => l.map(q).join(",")).join("\n");
}

/** A labelled diagram: boxes at the design's own positions, links between them. */
export function svg(doc: DesignDoc, title: string) {
  const { nodes, edges, sim } = breakdown(doc);
  const W = 190, H = 54;
  const box = new Map(nodes.map((n) => {
    const host = n.type === "host";
    const w = host ? Number(n.style?.width ?? 300) : W, h = host ? Number(n.style?.height ?? 190) : H;
    const parent = n.parentId ? nodes.find((p) => p.id === n.parentId) : undefined;
    return [n.id, { x: n.position.x + (parent?.position.x ?? 0), y: n.position.y + (parent?.position.y ?? 0), w, h, host, n }];
  }));
  const xs = [...box.values()].flatMap((b) => [b.x, b.x + b.w]), ys = [...box.values()].flatMap((b) => [b.y, b.y + b.h]);
  const pad = 40, minX = Math.min(0, ...xs) === 0 && xs.length ? Math.min(...xs) : 0, minY = ys.length ? Math.min(...ys) : 0;
  const vw = xs.length ? Math.max(...xs) - minX + pad * 2 : 400, vh = ys.length ? Math.max(...ys) - minY + pad * 2 + 24 : 200;
  const ox = pad - minX, oy = pad + 24 - minY;
  const hosts = [...box.values()].filter((b) => b.host), cards = [...box.values()].filter((b) => !b.host);
  const label = (b: (typeof hosts)[number]) => esc(b.n.data.name || TYPE_BY_ID[b.n.data.typeId].label);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" font-family="system-ui, sans-serif">`,
    `<rect width="100%" height="100%" fill="#fffff0"/>`,
    `<text x="${pad}" y="28" font-size="16" font-weight="700" fill="#1a1a1a">${esc(title)}</text>`,
    ...hosts.map((b) => `<rect x="${b.x + ox}" y="${b.y + oy}" width="${b.w}" height="${b.h}" rx="14" fill="#f4eefc" stroke="#9b8bb4" stroke-dasharray="6 4"/><text x="${b.x + ox + 12}" y="${b.y + oy + 20}" font-size="12" fill="#5b4b78">${label(b)}</text>`),
    ...edges.map((e) => {
      const a = box.get(e.source), b = box.get(e.target); if (!a || !b) return "";
      const x1 = a.x + ox + a.w / 2, y1 = a.y + oy + a.h / 2, x2 = b.x + ox + b.w / 2, y2 = b.y + oy + b.h / 2;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7a7a7a" stroke-width="1.5"/>`;
    }),
    ...cards.map((b) => {
      const over = (sim.util[b.n.id] ?? 0) > 1, cost = sim.nodeCost[b.n.id];
      return `<rect x="${b.x + ox}" y="${b.y + oy}" width="${b.w}" height="${b.h}" rx="10" fill="#fff" stroke="${over ? "#d9480f" : "#cfcfc0"}" stroke-width="${over ? 2.5 : 1.5}"/>`
        + `<text x="${b.x + ox + 12}" y="${b.y + oy + 22}" font-size="13" font-weight="600" fill="#1a1a1a">${label(b)}</text>`
        + `<text x="${b.x + ox + 12}" y="${b.y + oy + 40}" font-size="11" fill="#666">${esc(TYPE_BY_ID[b.n.data.typeId].label)}${cost ? " · " + usd(cost) + "/mo" : ""}</text>`;
    }),
    `</svg>`,
  ];
  return parts.join("");
}

export function reportHtml(doc: DesignDoc, title: string) {
  const { rows, sim, workload: w } = breakdown(doc);
  const tr = rows.filter((r) => r.cost > 0 || r.host).sort((a, b) => b.cost - a.cost)
    .map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.provider)}</td><td class=n>${Math.round(r.reqPerSec).toLocaleString("en-US")}</td><td class=n>${usd(r.cost)}</td><td class=n>${(r.share * 100).toFixed(1)}%</td><td>${r.basis}</td></tr>`).join("");
  return `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px system-ui;max-width:900px;margin:32px auto;padding:0 16px;color:#1a1a1a}table{border-collapse:collapse;width:100%}td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right}svg{max-width:100%;height:auto}small{color:#666}</style>
<h1>${esc(title)}</h1><p>${w.users.toLocaleString("en-US")} users · ${w.rps.toLocaleString("en-US")} req/s (peak ${w.peakRps.toLocaleString("en-US")}) · ${w.dataGb.toLocaleString("en-US")} GB · ${w.readPct}% reads</p>
${svg(doc, title)}<h2>Total ${usd(sim.cost)}/month</h2><table><tr><th>Component<th>Provider<th class=n>Req/s<th class=n>Cost/mo<th class=n>Share<th>Basis</tr>${tr}</table>
<p><small>Basis: Real price = fetched from a page; Your figure = entered by you; Illustrative = placeholder until prices load. Estimates only.</small></p><script>setTimeout(()=>print(),400)</script>`;
}

export async function xlsx(doc: DesignDoc, title: string, shareUrl: string | null) {
  const { rows, sim, workload: w } = breakdown(doc);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sysd"; wb.created = new Date();
  const bold = { bold: true };

  const s = wb.addWorksheet("Summary");
  s.columns = [{ width: 26 }, { width: 60 }];
  s.addRow([safe(title)]).font = { bold: true, size: 14 };
  s.addRow([]);
  const info: [string, string | number][] = [["Users", w.users], ["Requests per second", w.rps], ["Peak requests per second", w.peakRps], ["Data (GB)", w.dataGb], ["Read share (%)", w.readPct]];
  info.forEach(([k, v]) => s.addRow([k, v]));
  s.addRow([]);
  const t = s.addRow(["Total cost per month (USD)", { formula: "SUM(Costs!F2:F" + (rows.length + 1) + ")", result: sim.cost }]); t.font = bold; t.getCell(2).numFmt = "$#,##0.00";
  s.addRow(["Cost per user per month", { formula: `IF(B3>0,B${t.number}/B3,0)`, result: sim.unitCost }]).getCell(2).numFmt = "$#,##0.0000";
  s.addRow([]);
  const l = s.addRow(["Share link", shareUrl ? { text: shareUrl, hyperlink: shareUrl } : "Save the design to get a link"]);
  if (shareUrl) l.getCell(2).font = { color: { argb: "FF1D4ED8" }, underline: true };
  s.addRow(["Generated", new Date().toISOString().slice(0, 10)]);

  const c = wb.addWorksheet("Costs");
  c.columns = [{ header: "Component", width: 24 }, { header: "Service", width: 22 }, { header: "Provider", width: 20 }, { header: "Plan", width: 20 }, { header: "Req/s", width: 10 }, { header: "Cost/mo (USD)", width: 15 }, { header: "Share of cost", width: 13 }, { header: "$ per 1M req", width: 13 }, { header: "Basis", width: 14 }];
  c.getRow(1).font = bold; c.views = [{ state: "frozen", ySplit: 1 }];
  rows.forEach((r, i) => {
    const n = i + 2;
    c.addRow([safe(r.name), r.service, safe(r.provider), r.plan, Math.round(r.reqPerSec), r.cost, { formula: `IF(SUM($F$2:$F$${rows.length + 1})>0,F${n}/SUM($F$2:$F$${rows.length + 1}),0)`, result: r.share }, r.perMillion ?? "", r.basis]);
    c.getCell(`F${n}`).numFmt = "$#,##0.00"; c.getCell(`G${n}`).numFmt = "0.0%"; c.getCell(`H${n}`).numFmt = "$#,##0.00";
  });

  const tr = wb.addWorksheet("Traffic");
  tr.columns = [{ header: "Component", width: 24 }, { header: "Req/s", width: 12 }, { header: "Load vs capacity", width: 18 }, { header: "Status", width: 16 }];
  tr.getRow(1).font = bold;
  rows.filter((r) => !r.host).forEach((r) => {
    const row = tr.addRow([safe(r.name), Math.round(r.reqPerSec), r.util ?? "", r.util == null ? "n/a" : r.util > 1 ? "Over capacity" : r.util >= 0.8 ? "Near the limit" : "Fine"]);
    row.getCell(3).numFmt = "0%";
  });

  const n = wb.addWorksheet("Assumptions");
  n.columns = [{ width: 110 }];
  ["Real price: taken from a provider page we fetched (source and date are recorded with the price).", "Your figure: a cost you entered yourself.", "Illustrative: a placeholder until real prices load for that service.", "Capacity and load percentages use rule-of-thumb figures, accurate to roughly ±50%.", "These are estimates, not quotes. Check the provider's own calculator before you commit."].forEach((x) => n.addRow([x]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

import { toDoc } from "./doc";
import { useStudio } from "@/store/useStudio";
import { saveNow } from "@/components/studio/useAutosave";

export type ExportFormat = "png" | "svg" | "report" | "csv" | "json" | "xlsx";

export const EXPORTS: { id: ExportFormat; label: string; sub: string }[] = [
  { id: "png", label: "Diagram image", sub: "PNG, for slides and docs" },
  { id: "svg", label: "Diagram", sub: "SVG, sharp at any size" },
  { id: "report", label: "Cost report", sub: "Diagram, cost table and sources. Save as PDF" },
  { id: "xlsx", label: "Excel workbook", sub: "XLSX with formulas and your share link" },
  { id: "csv", label: "Cost table", sub: "CSV, for spreadsheets" },
  { id: "json", label: "Design data", sub: "JSON, the raw design" },
];

const slugify = (t: string) => t.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "design";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function svgToPng(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const m = svg.match(/viewBox="([\d.\-\s]+)"/);
    const [, , w, h] = (m?.[1] ?? "0 0 1200 800").trim().split(/\s+/).map(Number);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("This browser cannot make images."));
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the image."))), "image/png");
    };
    img.onerror = () => reject(new Error("Could not draw the diagram."));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

/**
 * Asks the server for the file (it checks the plan, so this cannot be skipped from the browser), then saves it.
 * The cost report opens a print view in a new tab; choose "Save as PDF" there.
 */
export async function exportDesign(format: ExportFormat): Promise<{ ok: true } | { ok: false; error: string }> {
  const st = useStudio.getState();
  const doc = toDoc(st.nodes, st.edges, st.workload);
  const title = st.design.title;
  // The workbook carries a share link, so the design has to exist on the server first.
  if (format === "xlsx" && !st.design.shared && st.design.level !== "view" && !(await saveNow())) return { ok: false, error: "Save the design first so the workbook can include its share link." };
  const designId = useStudio.getState().design.id ?? undefined;
  const win = format === "report" ? window.open("about:blank", "_blank") : null; // opened now, inside the click, so it is not blocked
  try {
    const res = await fetch("/api/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ format, title, doc, designId }) });
    if (!res.ok) {
      win?.close();
      const j = await res.json().catch(() => ({ error: "The export failed." }));
      return { ok: false, error: j.error ?? "The export failed." };
    }
    const base = slugify(title);
    if (format === "png") download(await svgToPng(await res.text()), `${base}.png`);
    else if (format === "svg") download(await res.blob(), `${base}.svg`);
    else if (format === "xlsx") download(await res.blob(), `${base}.xlsx`);
    else if (format === "csv") download(await res.blob(), `${base}-costs.csv`);
    else if (format === "json") download(await res.blob(), `${base}.json`);
    else {
      const html = await res.text();
      if (win) { win.document.open(); win.document.write(html); win.document.close(); }
      else download(new Blob([html], { type: "text/html" }), `${base}-report.html`);
    }
    return { ok: true };
  } catch (e) {
    win?.close();
    return { ok: false, error: e instanceof Error ? e.message : "The export failed." };
  }
}

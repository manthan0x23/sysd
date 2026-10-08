/**
 * Turns an uploaded image into a small icon we can keep in the design.
 * Raster images are scaled down to 96x96 PNG. SVG is kept as-is but only ever shown through <img>,
 * which cannot run scripts. Anything else, or anything too large, is refused with a plain reason.
 */
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SVG_BYTES = 100 * 1024;
const RASTER = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type IconResult = { ok: true; dataUrl: string } | { ok: false; reason: string };

const readAsDataUrl = (f: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });

export async function iconFromFile(file: File): Promise<IconResult> {
  if (file.size > MAX_BYTES) return { ok: false, reason: "That image is over 2 MB. Pick a smaller one." };
  if (file.type === "image/svg+xml") {
    if (file.size > MAX_SVG_BYTES) return { ok: false, reason: "That SVG is over 100 KB. Export a simpler one." };
    return { ok: true, dataUrl: await readAsDataUrl(file) };
  }
  if (!RASTER.has(file.type)) return { ok: false, reason: "Use a PNG, JPG, WebP, GIF or SVG image." };
  try {
    const bmp = await createImageBitmap(file);
    const S = 96;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    if (!ctx) return { ok: false, reason: "This browser cannot process images." };
    const k = Math.min(S / bmp.width, S / bmp.height);
    const w = bmp.width * k; const h = bmp.height * k;
    ctx.drawImage(bmp, (S - w) / 2, (S - h) / 2, w, h);
    return { ok: true, dataUrl: c.toDataURL("image/png") };
  } catch {
    return { ok: false, reason: "Could not read that image." };
  }
}

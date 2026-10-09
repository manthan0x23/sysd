/**
 * Turns a picked image into a small square (centre-cropped) that is cheap to store and show: 256 x 256, WebP when
 * the browser can write it, otherwise PNG. Runs in the browser, so only a few KB ever leave the device.
 */
const SIDE = 256;
const IN_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function squareImage(file: File, maxBytes: number): Promise<{ ok: true; blob: Blob; type: string } | { ok: false; reason: string }> {
  if (!IN_TYPES.has(file.type)) return { ok: false, reason: "Use a PNG, JPG, WebP or GIF image." };
  if (file.size > 8 * 1024 * 1024) return { ok: false, reason: "That image is over 8 MB. Pick a smaller one." };
  try {
    const bmp = await createImageBitmap(file);
    const c = document.createElement("canvas");
    c.width = c.height = SIDE;
    const ctx = c.getContext("2d");
    if (!ctx) return { ok: false, reason: "Could not read that image." };
    const s = Math.min(bmp.width, bmp.height);
    ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, SIDE, SIDE);
    bmp.close();
    for (const [type, q] of [["image/webp", 0.86], ["image/webp", 0.6], ["image/png", undefined]] as const) {
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, q));
      if (blob && blob.type === type && blob.size <= maxBytes) return { ok: true, blob, type };
    }
    return { ok: false, reason: "That image is too detailed to shrink enough. Try a simpler one." };
  } catch {
    return { ok: false, reason: "Could not read that image." };
  }
}

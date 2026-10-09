// Shared bits for price ingestion. Adapters return normalised Tier records with status "pending";
// nothing here publishes anything. See PLAN.md section C.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const OUT_DIR = join(process.cwd(), "data", "prices", "pending");

export async function getJson(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

export const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** Write one provider's pending records. `sourceUrl` is the human-checkable page behind the API. */
export async function writePending(provider, tiers, meta) {
  await mkdir(OUT_DIR, { recursive: true });
  const doc = { provider, fetchedAt: new Date().toISOString(), status: "pending", ...meta, count: tiers.length, tiers };
  const file = join(OUT_DIR, `${provider}.json`);
  await writeFile(file, JSON.stringify(doc, null, 2) + "\n");
  return file;
}

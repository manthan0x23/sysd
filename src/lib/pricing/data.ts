/**
 * Object-storage prices as scraped (Firecrawl, 2026-10-08), each with its source page.
 * Per-GB figures are USD. "TB" prices are converted at 1 TB = 1,000 GB.
 * Fields left undefined were not on the page; the estimate says so instead of guessing.
 */
export interface ObjectPrice {
  storagePerGb: number;
  putPer1k?: number;
  getPer1k?: number;
  egressPerGb: number;
  freeStorageGb?: number;
  freePut1k?: number;
  freeGet1k?: number;
  /** Egress is free up to this multiple of the data stored (Backblaze B2). */
  freeEgressMult?: number;
  /** Flat monthly fee that includes storage and egress allowances (DigitalOcean Spaces). */
  baseMonthly?: number;
  includedStorageGb?: number;
  includedEgressGb?: number;
  /** Storage billed even if you store less (Wasabi). */
  minStorageGb?: number;
  /** What the estimate leaves out. */
  gaps?: string;
  region?: string;
  source: string;
  fetchedAt: string;
}

const FETCHED = "2026-10-08";

export const OBJECT_PRICES: Record<string, ObjectPrice> = {
  "object:aws:s3": {
    storagePerGb: 0.023, putPer1k: 0.005, getPer1k: 0.0004, egressPerGb: 0.09, region: "US East (N. Virginia)",
    gaps: "Free tiers for new accounts are not applied.", source: "https://aws.amazon.com/s3/pricing/", fetchedAt: FETCHED,
  },
  "object:cloudflare:r2": {
    storagePerGb: 0.015, putPer1k: 0.0045, getPer1k: 0.00036, egressPerGb: 0, freeStorageGb: 10, freePut1k: 1000, freeGet1k: 10000,
    source: "https://developers.cloudflare.com/r2/pricing/", fetchedAt: FETCHED,
  },
  "object:backblaze:b2": {
    storagePerGb: 0.00695, egressPerGb: 0.01, freeEgressMult: 3, freeStorageGb: 10,
    gaps: "API transaction fees were not captured, so they are left out.", source: "https://www.backblaze.com/cloud-storage/pricing", fetchedAt: FETCHED,
  },
  "object:wasabi:hot-cloud-storage": {
    storagePerGb: 0.00799, egressPerGb: 0, putPer1k: 0, getPer1k: 0, minStorageGb: 1000,
    source: "https://wasabi.com/cloud-storage-pricing", fetchedAt: FETCHED,
  },
  "object:digitalocean:spaces": {
    storagePerGb: 0.02, egressPerGb: 0.01, baseMonthly: 5, includedStorageGb: 250, includedEgressGb: 1024,
    gaps: "Request fees are not listed on the page.", source: "https://www.digitalocean.com/pricing/spaces-object-storage", fetchedAt: FETCHED,
  },
};

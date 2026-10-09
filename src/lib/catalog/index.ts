import { OFFERINGS, offeringsOf } from "./offerings";
import { SERVICE_TYPES, TYPE_BY_ID } from "./services";
import type { ServiceType } from "./types";

export * from "./types";
export * from "./services";
export * from "./offerings";
export * from "./icons";
export * from "./plans";
export * from "./connections";

/** Search across type names, categories and every provider/product name ("neon" finds Postgres). */
export function searchTypes(q: string): { type: ServiceType; via?: string }[] {
  const t = q.trim().toLowerCase();
  const base = SERVICE_TYPES;
  if (!t) return base.map((type) => ({ type }));
  const hits: { type: ServiceType; via?: string }[] = [];
  for (const type of base) {
    if (`${type.label} ${type.category}`.toLowerCase().includes(t)) { hits.push({ type }); continue; }
    const o = offeringsOf(type.id).find((x) => `${x.provider} ${x.product}`.toLowerCase().includes(t));
    if (o) hits.push({ type, via: `${o.provider} ${o.product}` });
  }
  return hits;
}

export const COUNTS = { types: SERVICE_TYPES.length, offerings: OFFERINGS.length, providers: new Set(OFFERINGS.map((o) => o.provider)).size };
export { TYPE_BY_ID };

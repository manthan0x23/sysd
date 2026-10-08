export type Tier = "best" | "good" | "pricey" | "priciest" | "unpriced";

export const TIER_LABEL: Record<Tier, string> = {
  best: "Best value", good: "Good value", pricey: "Pricier", priciest: "Priciest", unpriced: "Not priced yet",
};

/**
 * Tiers relative to the cheapest option at this workload. Several options can share "Best value":
 * anything within 15% of the cheapest. "Priciest" is reserved for options near the top of the range, so a
 * mid-priced option is not lumped in with the worst. Needs at least two priced options to say anything.
 */
export function tiers(costs: (number | null)[]): Tier[] {
  const priced = costs.filter((c): c is number => c != null);
  if (priced.length < 2) return costs.map((c) => (c == null ? "unpriced" : "best"));
  const min = Math.max(Math.min(...priced), 1); // floor avoids dividing by ~0 for free tiers
  const max = Math.max(...priced);
  return costs.map((c) => {
    if (c == null) return "unpriced";
    const r = Math.max(c, 1) / min;
    if (r <= 1.15) return "best";
    if (r <= 1.6) return "good";
    // Far above the cheapest: only options close to the very top are "Priciest", the rest are "Pricier".
    return r <= 3 || c < 0.5 * max ? "pricey" : "priciest";
  });
}

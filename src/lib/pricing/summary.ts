import type { Offering, Plan } from "../catalog";
import { plansOf } from "../catalog";
import { OBJECT_PRICES } from "./data";
import { describeLimits } from "./estimate";

const usd = (n: number) => (n >= 100 ? `$${Math.round(n)}` : n >= 1 ? `$${+n.toFixed(2)}` : `$${+n.toPrecision(2)}`);

/** One line of list-price facts for an offering, shown in the picker so the choice is informed. */
export function offeringSummary(o: Offering): string {
  const p = OBJECT_PRICES[o.id];
  if (p) {
    const parts: string[] = [];
    if (p.baseMonthly != null) parts.push(`${usd(p.baseMonthly)}/mo incl. ${p.includedStorageGb} GB and ${Math.round((p.includedEgressGb ?? 0) / 1024)} TB out`);
    else parts.push(`${usd(p.storagePerGb * 1000)}/TB-mo`);
    parts.push(p.egressPerGb === 0 ? "no egress fees" : p.freeEgressMult ? `${usd(p.egressPerGb)}/GB out, free to ${p.freeEgressMult}× stored` : `${usd(p.egressPerGb)}/GB out`);
    if (p.minStorageGb) parts.push(`${p.minStorageGb / 1000} TB minimum`);
    return parts.join(" · ");
  }
  const plans = plansOf(o.id);
  if (plans.length) {
    const priced = plans.filter((x) => x.price != null);
    const free = priced.some((x) => x.free);
    const paid = priced.filter((x) => x.price! > 0);
    if (priced.length) return `${free ? "Free tier" : "from"}${paid.length ? `${free ? ", then from" : ""} ${usd(Math.min(...paid.map((x) => x.price!)))}/mo` : ""} · ${plans.length} plan${plans.length === 1 ? "" : "s"}`;
    const t = plans.filter((x) => x.tokens);
    if (t.length) return `from ${usd(Math.min(...t.map((x) => x.tokens!.inPerM)))} in / ${usd(Math.min(...t.map((x) => x.tokens!.outPerM)))} out per 1M tokens · ${t.length} models`;
  }
  return "Price not loaded yet";
}

export function planSummary(p: Plan): string {
  if (p.tokens) return `${usd(p.tokens.inPerM)} in · ${usd(p.tokens.outPerM)} out per 1M tokens`;
  const parts: string[] = [];
  if (p.spec) parts.push(`${p.spec.vcpu} vCPU`, `${p.spec.ramGb < 1 ? "512 MB" : `${p.spec.ramGb} GB`} RAM`, `${p.spec.diskGb} GB`);
  if (p.free) parts.push(`Free${describeLimits(p.limits)}`);
  else if (p.price != null) parts.push(`${usd(p.price)}/mo${p.priceIntro != null ? ` (intro ${usd(p.priceIntro)})` : ""}`);
  return parts.join(" · ");
}

import type { Need, Offering, Plan } from "../catalog";
import { OBJECT_PRICES } from "./data";

export const SECONDS_PER_MONTH = 2_592_000; // 30 days

/** Assumptions the estimates rest on. Shown next to every estimate so they can be challenged. */
export const ASSUME = {
  objectKb: 100,
  llmInTokens: 1000,
  llmOutTokens: 300,
};

export interface Usage {
  /** Requests per second reaching this component. */
  rps: number;
  dataGb: number;
  /** 0..1 */
  read: number;
  /** What a server must hold, including OS overhead. */
  need?: Need;
}

export interface Estimate {
  monthly: number;
  lines: { label: string; amount: number }[];
  assumptions: string[];
  /** Set when the page lacked something and the number is a lower bound. */
  partial?: string;
}

const money = (n: number) => Math.round(n * 100) / 100;

function objectEstimate(o: Offering, u: Usage): Estimate | null {
  const p = OBJECT_PRICES[o.id];
  if (!p) return null;
  const reads = u.rps * u.read * SECONDS_PER_MONTH;
  const writes = u.rps * (1 - u.read) * SECONDS_PER_MONTH;
  const egressGb = (reads * ASSUME.objectKb) / 1e6;
  const stored = Math.max(u.dataGb, p.minStorageGb ?? 0);
  const lines: Estimate["lines"] = [];

  if (p.baseMonthly != null) {
    lines.push({ label: "Base plan", amount: p.baseMonthly });
    lines.push({ label: "Extra storage", amount: Math.max(0, stored - (p.includedStorageGb ?? 0)) * p.storagePerGb });
  } else {
    lines.push({ label: "Storage", amount: Math.max(0, stored - (p.freeStorageGb ?? 0)) * p.storagePerGb });
  }
  const freeEgress = (p.freeEgressMult ?? 0) * u.dataGb + (p.includedEgressGb ?? 0);
  lines.push({ label: "Data out", amount: Math.max(0, egressGb - freeEgress) * p.egressPerGb });
  if (p.putPer1k) lines.push({ label: "Write requests", amount: Math.max(0, writes / 1000 - (p.freePut1k ?? 0)) * p.putPer1k });
  if (p.getPer1k) lines.push({ label: "Read requests", amount: Math.max(0, reads / 1000 - (p.freeGet1k ?? 0)) * p.getPer1k });

  const clean = lines.map((l) => ({ ...l, amount: money(l.amount) })).filter((l) => l.amount > 0 || l.label === "Storage");
  return {
    monthly: money(lines.reduce((a, l) => a + l.amount, 0)), lines: clean,
    assumptions: [`Average object ${ASSUME.objectKb} KB, read share from your workload.`, ...(p.minStorageGb ? [`Billed for at least ${p.minStorageGb / 1000} TB.`] : []), ...(p.region ? [p.region + " prices."] : [])],
    partial: p.gaps,
  };
}

function tokenEstimate(plan: Plan, u: Usage): Estimate | null {
  if (!plan.tokens) return null;
  const calls = u.rps * SECONDS_PER_MONTH;
  const inM = (calls * ASSUME.llmInTokens) / 1e6;
  const outM = (calls * ASSUME.llmOutTokens) / 1e6;
  const a = money(inM * plan.tokens.inPerM);
  const b = money(outM * plan.tokens.outPerM);
  return {
    monthly: money(a + b), lines: [{ label: "Input tokens", amount: a }, { label: "Output tokens", amount: b }],
    assumptions: [`${ASSUME.llmInTokens.toLocaleString("en-US")} input and ${ASSUME.llmOutTokens} output tokens per call, one call per request.`, "No caching or batch discounts applied."],
  };
}

/** Monthly cost of one offering (and plan) at this usage, or null when we have no real prices for it. */
export function estimate(o: Offering | undefined, plan: Plan | undefined, u: Usage): Estimate | null {
  if (!o) return null;
  if (o.typeId === "object") return objectEstimate(o, u);
  if (o.typeId === "llm") return plan ? tokenEstimate(plan, u) : null;
  if (o.typeId === "vps") return plan?.price != null ? { monthly: plan.price, lines: [{ label: plan.label, amount: plan.price }], assumptions: ["Sustained price; intro discounts are ignored."] } : null;
  return null;
}

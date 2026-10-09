import type { Node } from "@xyflow/react";
import type { FitResult } from "./fit";
import { AUTO_PLAN_ID, CUSTOM_PLAN_ID, OFFERING_BY_ID, TYPE_BY_ID, plansOf, type Need, type Offering, type Plan, type ServiceType } from "./catalog";

/** The user's own figure for a component: a fixed monthly amount, plus an amount per million requests it handles. */
export interface CustomCost { fixed: number; perMillion: number; bucket?: "compute" | "storage" | "transfer" | "managed" | "people" }

export interface CustomPlan { vcpu: number; ramGb: number; diskGb: number; price: number }

export interface NodeData extends Record<string, unknown> {
  typeId: string;
  /** User-given name, e.g. "Orders DB". Shown instead of the service type. */
  name?: string;
  /** User-uploaded icon as a small data URL (resized PNG, or SVG shown through <img>). */
  icon?: string;
  offeringId?: string;
  /** A listed plan id, "custom", or "auto" (cheapest tier that fits, recomputed as numbers change). */
  planId?: string;
  custom?: CustomPlan;
  /** Identical copies running side by side (1 when absent). A database with 3 is a primary plus 2 read replicas. */
  replicas?: number;
  /** Replicas follow the load between min and max instead of staying fixed. Compute only. */
  autoscale?: { min: number; max: number };
  /** Share of requests answered without going further (0-100). Caches and CDNs; the default depends on the type. */
  hitRate?: number;
  /** Overrides every other price for this component; the cost is "yours". */
  customCost?: CustomCost;
  /** Derived for rendering; never stored or exported. */
  util?: number | null;
  load?: number;
  showMetrics?: boolean;
  fit?: FitResult;
  /** Derived: copies running now, and messages per second that pile up because consumers are too slow. */
  instances?: number;
  backlog?: number;
}

export type StudioNode = Node<NodeData, "card" | "host">;

export const DEFAULT_CUSTOM: CustomPlan = { vcpu: 2, ramGb: 4, diskGb: 80, price: 20 };

export const typeOf = (d: NodeData): ServiceType => TYPE_BY_ID[d.typeId];
export const offeringOf = (d: NodeData): Offering | undefined => (d.offeringId ? OFFERING_BY_ID[d.offeringId] : undefined);
export const isAuto = (d: NodeData) => {
  if (!d.planId || d.planId === AUTO_PLAN_ID) return true;
  if (d.planId === CUSTOM_PLAN_ID) return false;
  // A plan id that no longer exists (the price list was refreshed and renamed it) means Auto, not "the first plan".
  return !(d.offeringId && plansOf(d.offeringId).some((p) => p.id === d.planId));
};

/** A plan the user chose explicitly: their custom specs, or a listed plan by id. Undefined means "auto". */
export function explicitPlan(d: NodeData): Plan | undefined {
  if (d.planId === CUSTOM_PLAN_ID) {
    const c = d.custom ?? DEFAULT_CUSTOM;
    return { id: CUSTOM_PLAN_ID, label: "Custom", spec: { vcpu: c.vcpu, ramGb: c.ramGb, diskGb: c.diskGb }, price: c.price };
  }
  if (isAuto(d) || !d.offeringId) return undefined;
  return plansOf(d.offeringId).find((p) => p.id === d.planId);
}

export const needOf = (n: Need) => `${+n.cpu.toFixed(2)} vCPU · ${+n.ramGb.toFixed(1)} GB RAM · ${Math.round(n.diskGb)} GB disk`;

export const MAX_REPLICAS = 50;
/** Share of capacity an autoscaler aims for; it adds copies above this. */
export const AUTOSCALE_TARGET = 0.7;
export const DEFAULT_HIT: Record<string, number> = { cache: 80, cdn: 95 };

/** Types that keep a hit rate, and what it starts at. */
export const defaultHitRate = (typeId: string): number | null => {
  const t = TYPE_BY_ID[typeId];
  return t ? (t.id === "cdn" ? DEFAULT_HIT.cdn : t.role === "cache" ? DEFAULT_HIT.cache : null) : null;
};
export const hitRateOf = (d: NodeData): number | null => {
  const def = defaultHitRate(d.typeId);
  return def == null ? null : d.hitRate ?? def;
};

/**
 * Whether copies make sense for a node: compute, databases, caches and streams you run or have managed.
 * Not for pay-per-use services (serverless, SaaS) which scale on their own, not for anything inside a server
 * block (its size comes from the server), and not for clients, blocks or edge appliances.
 */
export function scaleOf(d: NodeData, inHost: boolean): "none" | "fixed" | "auto" {
  const t = TYPE_BY_ID[d.typeId];
  if (!t || inHost || t.cap == null) return "none";
  if (t.role !== "compute" && t.role !== "db" && t.role !== "cache" && t.role !== "stream") return "none";
  const model = offeringOf(d)?.model;
  if (model === "serverless" || model === "saas" || model === "self-hosted") return "none";
  return t.role === "compute" ? "auto" : "fixed";
}

/** Copies running for a node at a given load: the fixed count, or what the autoscaler would pick. */
export function instancesFor(d: NodeData, inHost: boolean, load: number): number {
  const mode = scaleOf(d, inHost);
  if (mode === "none") return 1;
  const cap = TYPE_BY_ID[d.typeId].cap ?? 0;
  if (mode === "auto" && d.autoscale && cap > 0) {
    const min = Math.max(1, Math.round(d.autoscale.min)), max = Math.max(min, Math.round(d.autoscale.max));
    return Math.min(max, Math.max(min, Math.ceil(load / (cap * AUTOSCALE_TARGET))));
  }
  return Math.min(MAX_REPLICAS, Math.max(1, Math.round(d.replicas ?? 1)));
}

import type { Node } from "@xyflow/react";
import type { FitResult } from "./fit";
import { AUTO_PLAN_ID, CUSTOM_PLAN_ID, OFFERING_BY_ID, TYPE_BY_ID, plansOf, type Need, type Offering, type Plan, type ServiceType } from "./catalog";

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
  /** Derived for rendering; never stored or exported. */
  util?: number | null;
  load?: number;
  showMetrics?: boolean;
  fit?: FitResult;
}

export type StudioNode = Node<NodeData, "card" | "host">;

export const DEFAULT_CUSTOM: CustomPlan = { vcpu: 2, ramGb: 4, diskGb: 80, price: 20 };

export const typeOf = (d: NodeData): ServiceType => TYPE_BY_ID[d.typeId];
export const offeringOf = (d: NodeData): Offering | undefined => (d.offeringId ? OFFERING_BY_ID[d.offeringId] : undefined);
export const isAuto = (d: NodeData) => !d.planId || d.planId === AUTO_PLAN_ID;

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

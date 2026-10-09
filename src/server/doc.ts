import { z } from "zod";
import { TYPE_BY_ID } from "@/lib/catalog";
import type { DesignDoc } from "@/lib/doc";

const finite = (min: number, max: number) => z.number().finite().min(min).max(max);
const id = z.string().min(1).max(80);

const Node = z.object({
  id,
  type: z.string().max(40).refine((t) => t in TYPE_BY_ID, "unknown service type"),
  name: z.string().max(40).optional(),
  // A small uploaded image. Only image data URLs, and capped, so a design cannot smuggle in large or odd payloads.
  icon: z.string().max(200_000).regex(/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/).optional(),
  offering: z.string().max(160).optional(),
  plan: z.string().max(60).optional(),
  custom: z.object({ vcpu: finite(0, 100_000), ramGb: finite(0, 1_000_000), diskGb: finite(0, 10_000_000), price: finite(0, 10_000_000) }).optional(),
  cost: z.object({ fixed: finite(0, 1e9), perMillion: finite(0, 1e9), bucket: z.enum(["compute", "storage", "transfer", "managed", "people"]).optional() }).optional(),
  replicas: z.number().int().min(1).max(50).optional(),
  autoscale: z.object({ min: z.number().int().min(1).max(50), max: z.number().int().min(1).max(50) }).refine((a) => a.max >= a.min, "autoscale max is below min").optional(),
  hit: finite(0, 100).optional(),
  parent: id.optional(),
  x: finite(-1e6, 1e6), y: finite(-1e6, 1e6),
  width: finite(0, 1e5).optional(), height: finite(0, 1e5).optional(),
});

export const DocSchema = z.object({
  version: z.literal(2),
  workload: z.object({
    users: finite(0, 1e11), dataGb: finite(0, 1e9), rps: finite(0, 1e9), peakRps: finite(0, 1e9), readPct: finite(0, 100), atPeak: z.boolean(),
    seats: finite(0, 1e5).optional(), ciMinutes: finite(0, 1e8).optional(), monitors: finite(0, 1e6).optional(), hosts: finite(0, 1e6).optional(), ingestGb: finite(0, 1e8).optional(), events: finite(0, 1e12).optional(),
  }),
  nodes: z.array(Node).max(400),
  edges: z.array(z.object({ id, from: id, to: id, weight: finite(0, 100).optional() })).max(1200),
}).superRefine((d, ctx) => {
  const ids = new Set(d.nodes.map((n) => n.id));
  if (ids.size !== d.nodes.length) ctx.addIssue({ code: "custom", message: "duplicate node ids" });
  for (const n of d.nodes) if (n.parent && !ids.has(n.parent)) ctx.addIssue({ code: "custom", message: `node ${n.id} has a missing parent` });
  for (const e of d.edges) if (!ids.has(e.from) || !ids.has(e.to)) ctx.addIssue({ code: "custom", message: `link ${e.id} points at a missing node` });
});

export const MAX_DOC_BYTES = 2 * 1024 * 1024;

export function parseDoc(input: unknown): DesignDoc {
  if (JSON.stringify(input ?? null).length > MAX_DOC_BYTES) throw new UserError("That design is too large to save (over 2 MB). Remove some uploaded icons.");
  const r = DocSchema.safeParse(input);
  if (!r.success) throw new UserError(`The design could not be saved: ${r.error.issues[0]?.message ?? "invalid data"}.`);
  return r.data as DesignDoc;
}

/** An error whose message is safe and useful to show to the person using the app. */
export class UserError extends Error {}

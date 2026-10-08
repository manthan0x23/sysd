import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { UserError } from "./doc";

export type PlanName = "free" | "pro";

/** Pro features. Keep every check here so a new feature gates the same way everywhere. */
export const FEATURES = { aiAgent: "pro", teams: "pro" } as const satisfies Record<string, PlanName>;

export async function getPlan(userId: string): Promise<PlanName> {
  const [u] = await db.select({ plan: schema.users.plan, exp: schema.users.planExpiresAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!u) return "free";
  return u.plan === "pro" && (!u.exp || u.exp.getTime() > Date.now()) ? "pro" : "free";
}

export async function requireFeature(userId: string, feature: keyof typeof FEATURES) {
  if ((await getPlan(userId)) !== FEATURES[feature]) {
    throw new UserError(feature === "teams" ? "Teams are part of the Pro plan." : "The AI agent is part of the Pro plan.");
  }
}

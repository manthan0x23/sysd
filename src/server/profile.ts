import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { CLOUDS, LEVELS, PURPOSES, ROLES, type Profile } from "@/lib/profile";

const Input = z.object({
  role: z.enum(ROLES).optional(),
  purpose: z.enum(PURPOSES).optional(),
  level: z.enum(LEVELS).optional(),
  clouds: z.array(z.enum(CLOUDS)).max(CLOUDS.length).optional(),
  // Free text goes into the agent's context later, so keep it short and plain.
  company: z.string().trim().max(60).transform((s) => s.replace(/[\r\n\t]+/g, " ")).optional(),
});

export async function needsWelcome(userId: string): Promise<boolean> {
  const [u] = await db.select({ at: schema.users.onboardedAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return !!u && u.at == null;
}

/** Saves the welcome answers (or none, when skipped) and marks the screen done. */
export async function saveProfile(userId: string, input: unknown): Promise<void> {
  const parsed = Input.safeParse(input ?? {});
  const profile: Profile = parsed.success ? Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== "" && !(Array.isArray(v) && !v.length) && v != null)) : {};
  await db.update(schema.users).set({ profile, onboardedAt: new Date() }).where(eq(schema.users.id, userId));
}

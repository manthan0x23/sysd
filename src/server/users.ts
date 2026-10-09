import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { users, identities } = schema;

interface Profile { name?: string | null; email?: string | null }

/**
 * Finds or creates the profile for a sign-in. Matching is on (provider, provider account id) only, never on
 * email, so two different accounts can never be merged by sharing an address.
 */
export async function upsertUser(provider: string, providerAccountId: string, p: Profile): Promise<string> {
  const find = async () => (await db.select({ userId: identities.userId }).from(identities)
    .where(and(eq(identities.provider, provider), eq(identities.providerAccountId, providerAccountId))).limit(1))[0];

  const existing = await find();
  if (existing) {
    await db.update(users).set({ name: p.name ?? null, email: p.email ?? null, lastLoginAt: new Date() }).where(eq(users.id, existing.userId));
    return existing.userId;
  }
  try {
    return await db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values({ name: p.name ?? null, email: p.email ?? null }).returning({ id: users.id });
      await tx.insert(identities).values({ userId: u.id, provider, providerAccountId, email: p.email ?? null });
      return u.id;
    });
  } catch (e) {
    // Two first sign-ins at once: the other one created it, so use theirs.
    const raced = await find();
    if (raced) return raced.userId;
    throw e;
  }
}

export async function getUser(id: string) {
  const [u] = await db.select({ id: users.id, name: users.name, email: users.email, avatar: users.avatar, plan: users.plan, planExpiresAt: users.planExpiresAt }).from(users).where(eq(users.id, id)).limit(1);
  return u ?? null;
}

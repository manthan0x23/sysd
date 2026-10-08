import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type TeamLevel = "owner" | "editor" | "viewer";
/** What a person may do with a design: owner (also delete and share), edit, or just view. */
export type DesignLevel = "owner" | "edit" | "view";

export async function teamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
  const [t] = await db.select({ ownerId: schema.teams.ownerId }).from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
  if (!t) return null;
  if (t.ownerId === userId) return "owner";
  const [m] = await db.select({ role: schema.teamMembers.role }).from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId))).limit(1);
  return m?.role ?? null;
}

/**
 * Personal designs belong to their owner only. Team designs follow the team: its owner has full control,
 * editors can change them, viewers can only look. Someone who has left a team loses access to its designs.
 */
export async function designAccess(userId: string, designId: string) {
  const [design] = await db.select().from(schema.designs).where(eq(schema.designs.id, designId)).limit(1);
  if (!design) return null;
  let level: DesignLevel | null = null;
  if (!design.teamId) level = design.ownerId === userId ? "owner" : null;
  else {
    const t = await teamLevel(userId, design.teamId);
    level = t === "owner" ? "owner" : t === "editor" ? "edit" : t === "viewer" ? "view" : null;
  }
  return level ? { design, level } : null;
}

export const canEdit = (l: DesignLevel) => l === "owner" || l === "edit";

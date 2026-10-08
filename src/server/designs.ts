import { and, desc, eq, isNull, or, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DesignDoc } from "@/lib/doc";
import { canEdit, designAccess, teamLevel, type DesignLevel } from "./access";
import { parseDoc, UserError } from "./doc";
import { renderThumb } from "./thumb";

const { designs, teams, teamMembers, users } = schema;

export interface DesignRow { id: string; title: string; status: "draft" | "saved"; updatedAt: Date; teamId: string | null; ownerName: string | null; thumb: string | null }

const cleanTitle = (t: string | undefined, fallback = "Untitled design") => {
  const v = (t ?? "").trim().slice(0, 80);
  return v || fallback;
};

const NOT_FOUND = new UserError("That design does not exist, or you do not have access to it.");

/** Personal designs first, then one group per team the person belongs to. */
export async function listDesigns(userId: string) {
  const cols = { id: designs.id, title: designs.title, status: designs.status, updatedAt: designs.updatedAt, teamId: designs.teamId, ownerName: users.name, thumb: designs.thumb };
  const personal: DesignRow[] = await db.select(cols).from(designs).innerJoin(users, eq(users.id, designs.ownerId))
    .where(and(eq(designs.ownerId, userId), isNull(designs.teamId))).orderBy(desc(designs.updatedAt));

  const myTeams = await db.select({ id: teams.id, name: teams.name, ownerId: teams.ownerId, role: teamMembers.role })
    .from(teams).leftJoin(teamMembers, and(eq(teamMembers.teamId, teams.id), eq(teamMembers.userId, userId)))
    .where(or(eq(teams.ownerId, userId), eq(teamMembers.userId, userId)));

  await backfillThumbs(personal);
  const groups = [];
  for (const t of myTeams) {
    const rows: DesignRow[] = await db.select(cols).from(designs).innerJoin(users, eq(users.id, designs.ownerId)).where(eq(designs.teamId, t.id)).orderBy(desc(designs.updatedAt));
    await backfillThumbs(rows);
    groups.push({ team: { id: t.id, name: t.name }, level: (t.ownerId === userId ? "owner" : t.role) as "owner" | "editor" | "viewer", designs: rows });
  }
  return { personal, teams: groups };
}

/** Designs saved before previews existed get one the first time they are listed. */
async function backfillThumbs(rows: DesignRow[]) {
  for (const r of rows.filter((x) => x.thumb == null).slice(0, 12)) {
    const [d] = await db.select({ doc: designs.doc }).from(designs).where(eq(designs.id, r.id)).limit(1);
    if (!d) continue;
    r.thumb = renderThumb(d.doc as DesignDoc);
    await db.update(designs).set({ thumb: r.thumb }).where(eq(designs.id, r.id));
  }
}

export async function getDesign(userId: string, id: string) {
  const a = await designAccess(userId, id);
  if (!a) throw NOT_FOUND;
  return { id: a.design.id, title: a.design.title, status: a.design.status, rev: a.design.rev, teamId: a.design.teamId, doc: a.design.doc as DesignDoc, level: a.level as DesignLevel, updatedAt: a.design.updatedAt };
}

export async function createDesign(userId: string, input: { title?: string; status?: "draft" | "saved"; doc: unknown; teamId?: string | null }) {
  const doc = parseDoc(input.doc);
  if (input.teamId) {
    const lvl = await teamLevel(userId, input.teamId);
    if (lvl !== "owner" && lvl !== "editor") throw new UserError("You can only add designs to teams where you are an editor.");
  }
  const [row] = await db.insert(designs).values({
    ownerId: userId, teamId: input.teamId ?? null, title: cleanTitle(input.title), status: input.status ?? "draft", doc, thumb: renderThumb(doc),
  }).returning({ id: designs.id, rev: designs.rev });
  return row;
}

/**
 * Saves changes. `baseRev` is the revision the editor started from; if someone else saved since, the write is
 * refused (instead of silently replacing their work) and the caller is told to reload.
 */
export async function saveDesign(userId: string, id: string, input: { title?: string; status?: "draft" | "saved"; doc?: unknown; baseRev: number }) {
  const a = await designAccess(userId, id);
  if (!a) throw NOT_FOUND;
  if (!canEdit(a.level)) throw new UserError("You have view-only access to this design.");
  const patch: Partial<typeof designs.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = cleanTitle(input.title, a.design.title);
  if (input.status) patch.status = input.status;
  if (input.doc !== undefined) { const doc = parseDoc(input.doc); patch.doc = doc; patch.thumb = renderThumb(doc); }
  const rows = await db.update(designs).set({ ...patch, rev: dsql`${designs.rev} + 1` })
    .where(and(eq(designs.id, id), eq(designs.rev, input.baseRev))).returning({ rev: designs.rev, updatedAt: designs.updatedAt });
  if (!rows.length) throw new UserError("Someone else saved this design since you opened it. Reload to get their changes.");
  return rows[0];
}

/** Only the owner (or a team's owner) can delete; editors can change a design but not remove it. */
export async function deleteDesign(userId: string, id: string) {
  const a = await designAccess(userId, id);
  if (!a) throw NOT_FOUND;
  if (a.level !== "owner") throw new UserError("Only the owner can delete this design.");
  await db.delete(designs).where(eq(designs.id, id));
}

/** Copies a design you can see into your own personal designs (as a draft). */
export async function duplicateDesign(userId: string, id: string) {
  const a = await designAccess(userId, id);
  if (!a) throw NOT_FOUND;
  const [row] = await db.insert(designs).values({ ownerId: userId, teamId: null, title: cleanTitle(`${a.design.title} (copy)`), status: "draft", doc: a.design.doc, thumb: a.design.thumb }).returning({ id: designs.id });
  return row;
}

import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DesignDoc } from "@/lib/doc";
import { canEdit, designAccess } from "./access";
import { UserError } from "./doc";

const { shares, designs } = schema;

/** Anyone can open a share link without an account, so the token must be unguessable: 128 random bits. */
const newToken = () => randomBytes(16).toString("base64url");

async function editableDesign(userId: string, designId: string) {
  const a = await designAccess(userId, designId);
  if (!a) throw new UserError("That design does not exist, or you do not have access to it.");
  if (!canEdit(a.level)) throw new UserError("You need edit access to share this design.");
  return a.design;
}

export async function createShare(userId: string, designId: string) {
  await editableDesign(userId, designId);
  const [row] = await db.insert(shares).values({ designId, token: newToken(), createdBy: userId }).returning({ id: shares.id, token: shares.token, createdAt: shares.createdAt });
  return row;
}

export async function listShares(userId: string, designId: string) {
  await editableDesign(userId, designId);
  return db.select({ id: shares.id, token: shares.token, createdAt: shares.createdAt, viewCount: shares.viewCount, lastViewedAt: shares.lastViewedAt, revokedAt: shares.revokedAt })
    .from(shares).where(eq(shares.designId, designId)).orderBy(desc(shares.createdAt));
}

export async function revokeShare(userId: string, shareId: string) {
  const [s] = await db.select({ designId: shares.designId }).from(shares).where(eq(shares.id, shareId)).limit(1);
  if (!s) throw new UserError("That link does not exist.");
  await editableDesign(userId, s.designId);
  await db.update(shares).set({ revokedAt: new Date() }).where(and(eq(shares.id, shareId), isNull(shares.revokedAt)));
}

/**
 * Opens a shared design. Returns null for an unknown, revoked or expired link. A view is counted unless the
 * person opening it is the one who created the link, so checking your own link does not inflate the number.
 */
export async function openShare(token: string, viewerId: string | null) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const [s] = await db.select({ id: shares.id, createdBy: shares.createdBy, expiresAt: shares.expiresAt, revokedAt: shares.revokedAt, designId: shares.designId })
    .from(shares).where(eq(shares.token, token)).limit(1);
  if (!s || s.revokedAt || (s.expiresAt && s.expiresAt.getTime() < Date.now())) return null;
  const [d] = await db.select({ title: designs.title, doc: designs.doc }).from(designs).where(eq(designs.id, s.designId)).limit(1);
  if (!d) return null;
  if (viewerId !== s.createdBy) await db.update(shares).set({ viewCount: dsql`${shares.viewCount} + 1`, lastViewedAt: new Date() }).where(eq(shares.id, s.id));
  return { title: d.title, doc: d.doc as DesignDoc };
}

/** Copies a shared design into the viewer's own drafts. Does not count as a view. */
export async function copyShared(userId: string, token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) throw new UserError("That link is not valid.");
  const [sh] = await db.select({ designId: shares.designId, expiresAt: shares.expiresAt, revokedAt: shares.revokedAt }).from(shares).where(eq(shares.token, token)).limit(1);
  if (!sh || sh.revokedAt || (sh.expiresAt && sh.expiresAt.getTime() < Date.now())) throw new UserError("That link is no longer active.");
  const [d] = await db.select({ title: designs.title, doc: designs.doc }).from(designs).where(eq(designs.id, sh.designId)).limit(1);
  if (!d) throw new UserError("That design no longer exists.");
  const [row] = await db.insert(designs).values({ ownerId: userId, teamId: null, title: `${d.title} (copy)`.slice(0, 80), status: "draft", doc: d.doc }).returning({ id: designs.id });
  return row;
}

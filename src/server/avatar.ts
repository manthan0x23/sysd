import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatAvatar, parseAvatar } from "@/lib/avatar";
import { teamLevel } from "./access";
import { UserError } from "./doc";
import { deleteUpload, keyBelongsTo, verifyUpload, type UploadScope } from "./uploads";

/** Checks a submitted avatar string; for uploads, that it is this owner's object and really arrived. */
async function accept(value: string, target: UploadScope, userId: string, previous: string | null): Promise<string> {
  const spec = parseAvatar(value);
  if (!spec) throw new UserError("That avatar is not one of the choices.");
  if (spec.kind === "upload") {
    if (!keyBelongsTo(spec.key, target, userId)) throw new UserError("That image does not belong to you.");
    if (spec.key !== parseAvatar(previous)?.["key" as never]) await verifyUpload(spec.key);
  }
  return formatAvatar(spec);
}

/** Removes the old uploaded image once a different avatar is saved. */
async function dropOld(previous: string | null, next: string) {
  const old = parseAvatar(previous);
  if (old?.kind === "upload" && previous !== next) await deleteUpload(old.key);
}

/** Saves the chosen avatar. Only the strings lib/avatar.ts accepts are stored, so nothing else can reach a page. */
export async function setAvatar(userId: string, value: string): Promise<void> {
  const [u] = await db.select({ avatar: schema.users.avatar }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const next = await accept(value, { scope: "avatar" }, userId, u?.avatar ?? null);
  await db.update(schema.users).set({ avatar: next }).where(eq(schema.users.id, userId));
  await dropOld(u?.avatar ?? null, next);
}

/** The team owner sets the team logo. */
export async function setTeamLogo(userId: string, teamId: string, value: string): Promise<void> {
  if ((await teamLevel(userId, teamId)) !== "owner") throw new UserError("Only the team owner can change the logo.");
  const [t] = await db.select({ logo: schema.teams.logo }).from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
  const next = await accept(value, { scope: "team", teamId }, userId, t?.logo ?? null);
  await db.update(schema.teams).set({ logo: next }).where(eq(schema.teams.id, teamId));
  await dropOld(t?.logo ?? null, next);
}

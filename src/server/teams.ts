import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull, gt, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { teamLevel } from "./access";
import { UserError } from "./doc";
import { requireFeature } from "./plans";

const { teams, teamMembers, teamInvites, users } = schema;
export type Role = "viewer" | "editor";
const INVITE_DAYS = 7;

const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const cleanName = (n: string) => {
  const v = n.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!v) throw new UserError("Give the team a name.");
  return v;
};

/** Creating a team is a Pro feature. */
export async function createTeam(userId: string, name: string) {
  await requireFeature(userId, "teams");
  const [t] = await db.insert(teams).values({ name: cleanName(name), ownerId: userId }).returning({ id: teams.id, name: teams.name });
  return t;
}

export async function listTeams(userId: string) {
  const rows = await db.select({ id: teams.id, name: teams.name, logo: teams.logo, ownerId: teams.ownerId, role: teamMembers.role })
    .from(teams).leftJoin(teamMembers, and(eq(teamMembers.teamId, teams.id), eq(teamMembers.userId, userId)))
    .where(or(eq(teams.ownerId, userId), eq(teamMembers.userId, userId))).orderBy(asc(teams.name));
  return rows.map((r) => ({ id: r.id, name: r.name, logo: r.logo, level: (r.ownerId === userId ? "owner" : r.role) as "owner" | Role }));
}

export async function getTeam(userId: string, teamId: string) {
  const level = await teamLevel(userId, teamId);
  if (!level) throw new UserError("That team does not exist, or you are not in it.");
  const [t] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  const members = await db.select({ userId: users.id, name: users.name, avatar: users.avatar, role: teamMembers.role })
    .from(teamMembers).innerJoin(users, eq(users.id, teamMembers.userId)).where(eq(teamMembers.teamId, teamId)).orderBy(asc(teamMembers.createdAt));
  const [owner] = await db.select({ id: users.id, name: users.name, avatar: users.avatar }).from(users).where(eq(users.id, t.ownerId)).limit(1);
  // Pending invites are only visible to the owner, and never include the secret part of the link.
  const invites = level === "owner"
    ? await db.select({ id: teamInvites.id, role: teamInvites.role, createdAt: teamInvites.createdAt, expiresAt: teamInvites.expiresAt })
      .from(teamInvites).where(and(eq(teamInvites.teamId, teamId), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt), gt(teamInvites.expiresAt, new Date())))
    : [];
  return { id: t.id, name: t.name, logo: t.logo, level, owner, members, invites };
}

/** Returns the invite token once. Only its hash is stored, so the link cannot be recovered later. */
export async function createInvite(userId: string, teamId: string, role: Role) {
  if ((await teamLevel(userId, teamId)) !== "owner") throw new UserError("Only the team owner can invite people.");
  await requireFeature(userId, "teams");
  if (role !== "viewer" && role !== "editor") throw new UserError("Choose viewer or editor.");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  await db.insert(teamInvites).values({ teamId, role, tokenHash: hash(token), createdBy: userId, expiresAt });
  return { token, expiresAt };
}

export async function revokeInvite(userId: string, teamId: string, inviteId: string) {
  if ((await teamLevel(userId, teamId)) !== "owner") throw new UserError("Only the team owner can cancel invites.");
  await db.update(teamInvites).set({ revokedAt: new Date() }).where(and(eq(teamInvites.id, inviteId), eq(teamInvites.teamId, teamId), isNull(teamInvites.acceptedAt)));
}

/** Previews an invite without using it, so the page can say which team you are about to join. */
export async function previewInvite(token: string) {
  const [i] = await db.select({ role: teamInvites.role, teamName: teams.name, expiresAt: teamInvites.expiresAt, acceptedAt: teamInvites.acceptedAt, revokedAt: teamInvites.revokedAt })
    .from(teamInvites).innerJoin(teams, eq(teams.id, teamInvites.teamId)).where(eq(teamInvites.tokenHash, hash(token))).limit(1);
  if (!i || i.acceptedAt || i.revokedAt || i.expiresAt.getTime() < Date.now()) return null;
  return { teamName: i.teamName, role: i.role };
}

/** Single use. The claim is one atomic UPDATE, so two people clicking the same link cannot both get in. */
export async function acceptInvite(userId: string, token: string) {
  return db.transaction(async (tx) => {
    const [claimed] = await tx.update(teamInvites).set({ acceptedAt: new Date(), acceptedBy: userId })
      .where(and(eq(teamInvites.tokenHash, hash(token)), isNull(teamInvites.acceptedAt), isNull(teamInvites.revokedAt), gt(teamInvites.expiresAt, new Date())))
      .returning({ teamId: teamInvites.teamId, role: teamInvites.role });
    if (!claimed) throw new UserError("This invite link is no longer valid. Ask for a new one.");
    const [t] = await tx.select({ ownerId: teams.ownerId }).from(teams).where(eq(teams.id, claimed.teamId)).limit(1);
    if (t.ownerId !== userId) {
      // Already a member: keep whichever role is higher, never downgrade by accepting an old invite.
      await tx.insert(teamMembers).values({ teamId: claimed.teamId, userId, role: claimed.role })
        .onConflictDoUpdate({ target: [teamMembers.teamId, teamMembers.userId], set: { role: claimed.role === "editor" ? "editor" : teamMembers.role } });
    }
    return { teamId: claimed.teamId };
  });
}

export async function setMemberRole(userId: string, teamId: string, targetId: string, role: Role) {
  if ((await teamLevel(userId, teamId)) !== "owner") throw new UserError("Only the team owner can change roles.");
  if (role !== "viewer" && role !== "editor") throw new UserError("Choose viewer or editor.");
  await db.update(teamMembers).set({ role }).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetId)));
}

/** The owner can remove anyone; any member can remove themselves (leave). */
export async function removeMember(userId: string, teamId: string, targetId: string) {
  const level = await teamLevel(userId, teamId);
  if (!level) throw new UserError("You are not in this team.");
  if (level !== "owner" && userId !== targetId) throw new UserError("Only the team owner can remove other people.");
  if (targetId === userId && level === "owner") throw new UserError("The owner cannot leave. Delete the team instead.");
  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetId)));
}

/** Deletes the team and, with it, every design saved in it. The UI asks for confirmation first. */
export async function deleteTeam(userId: string, teamId: string) {
  if ((await teamLevel(userId, teamId)) !== "owner") throw new UserError("Only the team owner can delete the team.");
  await db.delete(teams).where(eq(teams.id, teamId));
}

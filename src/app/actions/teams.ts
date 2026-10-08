"use server";

import { revalidatePath } from "next/cache";
import * as T from "@/server/teams";
import { requireUser } from "@/server/session";
import { run } from "@/server/result";

type Role = "viewer" | "editor";

export async function createTeamAction(name: string) {
  return run(async () => { const t = await T.createTeam((await requireUser()).id, name); revalidatePath("/teams"); return { id: t.id }; });
}

/** The invite token is returned here once; only its hash is stored. */
export async function inviteAction(teamId: string, role: Role) {
  return run(async () => { const i = await T.createInvite((await requireUser()).id, teamId, role); revalidatePath(`/teams/${teamId}`); return { token: i.token, expiresAt: i.expiresAt.toISOString() }; });
}

export async function cancelInviteAction(teamId: string, inviteId: string) {
  return run(async () => { await T.revokeInvite((await requireUser()).id, teamId, inviteId); revalidatePath(`/teams/${teamId}`); });
}

export async function acceptInviteAction(token: string) {
  return run(async () => { const r = await T.acceptInvite((await requireUser()).id, token); revalidatePath("/teams"); return { teamId: r.teamId }; });
}

export async function setRoleAction(teamId: string, userId: string, role: Role) {
  return run(async () => { await T.setMemberRole((await requireUser()).id, teamId, userId, role); revalidatePath(`/teams/${teamId}`); });
}

export async function removeMemberAction(teamId: string, userId: string) {
  return run(async () => { await T.removeMember((await requireUser()).id, teamId, userId); revalidatePath(`/teams/${teamId}`); revalidatePath("/teams"); });
}

export async function deleteTeamAction(teamId: string) {
  return run(async () => { await T.deleteTeam((await requireUser()).id, teamId); revalidatePath("/teams"); });
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { run } from "@/server/result";
import { saveProfile } from "@/server/profile";
import { setAvatar, setTeamLogo } from "@/server/avatar";
import { requestUpload, type UploadScope } from "@/server/uploads";
import { UserError } from "@/server/doc";

export async function saveProfileAction(input: unknown) {
  return run(async () => { await saveProfile((await requireUser()).id, input); });
}

export async function setAvatarAction(avatar: string) {
  return run(async () => { await setAvatar((await requireUser()).id, avatar); });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Step one of an upload: a short-lived presigned URL the browser PUTs the image to. */
export async function requestUploadAction(target: UploadScope, contentType: string, size: number) {
  return run(async () => {
    if (target?.scope === "team" ? !UUID.test(target.teamId) : target?.scope !== "avatar") throw new UserError("Choose where the image goes.");
    return requestUpload((await requireUser()).id, target.scope === "team" ? { scope: "team", teamId: target.teamId } : { scope: "avatar" }, String(contentType), Number(size));
  });
}

export async function setTeamLogoAction(teamId: string, logo: string) {
  return run(async () => {
    if (!UUID.test(teamId)) throw new UserError("That team does not exist.");
    await setTeamLogo((await requireUser()).id, teamId, String(logo));
    revalidatePath("/teams");
    revalidatePath(`/teams/${teamId}`);
  });
}

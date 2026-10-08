"use server";

import { requireUser } from "@/server/session";
import { run } from "@/server/result";
import { saveProfile } from "@/server/profile";

export async function saveProfileAction(input: unknown) {
  return run(async () => { await saveProfile((await requireUser()).id, input); });
}

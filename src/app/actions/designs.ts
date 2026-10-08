"use server";

import * as D from "@/server/designs";
import { requireUser } from "@/server/session";
import { run } from "@/server/result";

type Status = "draft" | "saved";

export async function createDesignAction(input: { title?: string; status?: Status; doc: unknown; teamId?: string | null }) {
  return run(async () => D.createDesign((await requireUser()).id, input));
}

export async function saveDesignAction(id: string, input: { title?: string; status?: Status; doc?: unknown; baseRev: number }) {
  return run(async () => {
    const r = await D.saveDesign((await requireUser()).id, id, input);
    return { rev: r.rev, updatedAt: r.updatedAt.toISOString() };
  });
}

export async function deleteDesignAction(id: string) {
  return run(async () => D.deleteDesign((await requireUser()).id, id));
}

export async function duplicateDesignAction(id: string) {
  return run(async () => D.duplicateDesign((await requireUser()).id, id));
}

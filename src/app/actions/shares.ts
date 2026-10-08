"use server";

import * as S from "@/server/shares";
import { requireUser } from "@/server/session";
import { run } from "@/server/result";

export async function createShareAction(designId: string) {
  return run(async () => { const s = await S.createShare((await requireUser()).id, designId); return { id: s.id, token: s.token }; });
}

export async function listSharesAction(designId: string) {
  return run(async () => (await S.listShares((await requireUser()).id, designId)).map((s) => ({
    id: s.id, token: s.token, viewCount: s.viewCount, createdAt: s.createdAt.toISOString(), lastViewedAt: s.lastViewedAt?.toISOString() ?? null, revoked: s.revokedAt != null,
  })));
}

export async function revokeShareAction(shareId: string) {
  return run(async () => S.revokeShare((await requireUser()).id, shareId));
}

export async function copySharedAction(token: string) {
  return run(async () => S.copyShared((await requireUser()).id, token));
}

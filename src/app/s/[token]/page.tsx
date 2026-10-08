import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Studio } from "@/components/studio/Studio";
import { StudioSkeleton } from "@/components/studio/StudioSkeleton";
import { APP_NAME } from "@/lib/brand";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import { openShare } from "@/server/shares";

export const metadata: Metadata = { title: `Shared design | ${APP_NAME}`, robots: { index: false, follow: false } };

/** A shared link still needs a profile: it opens read-only, and each open by someone else is counted. */
async function Gate({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const u = await currentUser();
  if (!u) redirect(`/login?next=/s/${encodeURIComponent(token)}`);
  const shared = await openShare(token, u.id);
  if (!shared) notFound();
  const initial = { id: null, title: shared.title, status: "saved" as const, rev: 0, teamId: null, level: null, shared: true, doc: shared.doc };
  const plan = await getPlan(u.id);
  return <Studio user={{ name: u.name, image: u.image }} plan={plan} initial={initial} hydrateKey={`s-${token}`} shareToken={token} />;
}

export default function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <Gate params={params} />
    </Suspense>
  );
}

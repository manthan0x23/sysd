import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Studio } from "@/components/studio/Studio";
import { StudioSkeleton } from "@/components/studio/StudioSkeleton";
import { APP_NAME } from "@/lib/brand";
import { BLANK_DOC } from "@/lib/doc";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: `Canvas | ${APP_NAME}` };

/** Everything in the app belongs to a profile: no session, no canvas. */
async function Gate({ searchParams }: { searchParams: Promise<{ fresh?: string; start?: string }> }) {
  await connection(); // the session is per request, so this cannot be prerendered
  const u = await currentUser();
  if (!u) redirect("/login?next=/app");
  const sp = await searchParams;
  const fresh = sp.fresh?.replace(/[^\w-]/g, "").slice(0, 16) || "0";
  const blank = sp.start === "blank";
  const initial = blank ? { id: null, title: "Untitled design", status: "draft" as const, rev: 0, teamId: null, level: null, doc: BLANK_DOC } : null;
  const plan = await getPlan(u.id);
  return <Studio user={{ name: u.name, image: u.image }} plan={plan} initial={initial} hydrateKey={`new-${fresh}${blank ? "-blank" : ""}`} />;
}

export default function CanvasPage({ searchParams }: { searchParams: Promise<{ fresh?: string; start?: string }> }) {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <Gate searchParams={searchParams} />
    </Suspense>
  );
}

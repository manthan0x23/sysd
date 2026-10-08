import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Studio } from "@/components/studio/Studio";
import { APP_NAME } from "@/lib/brand";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: `Canvas | ${APP_NAME}` };

/** Everything in the app belongs to a profile: no session, no canvas. */
async function Gate({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  await connection(); // the session is per request, so this cannot be prerendered
  const u = await currentUser();
  if (!u) redirect("/login");
  const fresh = (await searchParams).fresh?.replace(/[^\w-]/g, "").slice(0, 16) || "0";
  return <Studio user={{ name: u.name, image: u.image }} initial={null} hydrateKey={`new-${fresh}`} />;
}

export default function CanvasPage({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  return (
    <Suspense fallback={<div className="studio" aria-busy="true" />}>
      <Gate searchParams={searchParams} />
    </Suspense>
  );
}

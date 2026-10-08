import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";
import { Studio } from "@/components/studio/Studio";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: `Canvas | ${APP_NAME}` };

/** Everything in the app belongs to a profile: no session, no canvas. */
async function Gate() {
  await connection(); // the session is per request, so this cannot be prerendered
  const session = await auth();
  const u = session?.user;
  if (!u) redirect("/login");
  return <Studio user={{ name: u.name ?? u.email ?? "Account", image: u.image ?? null }} />;
}

export default function CanvasPage() {
  return (
    <Suspense fallback={<div className="studio" aria-busy="true" />}>
      <Gate />
    </Suspense>
  );
}

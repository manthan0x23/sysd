import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Studio } from "@/components/studio/Studio";
import { APP_NAME } from "@/lib/brand";
import { UserError } from "@/server/doc";
import { getDesign } from "@/server/designs";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: `Design | ${APP_NAME}`, robots: { index: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Gate({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const u = await currentUser();
  if (!u) redirect(`/login?next=/app/d/${id}`);
  let d;
  try { d = await getDesign(u.id, id); } catch (e) { if (e instanceof UserError) notFound(); throw e; }
  const initial = { id: d.id, title: d.title, status: d.status, rev: d.rev, teamId: d.teamId, level: d.level, doc: d.doc };
  return <Studio user={{ name: u.name, image: u.image }} initial={initial} hydrateKey={`d-${d.id}`} />;
}

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="studio" aria-busy="true" />}>
      <Gate params={params} />
    </Suspense>
  );
}

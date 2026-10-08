import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/pages/AppHeader";
import { TeamManager } from "@/components/pages/TeamForms";
import { APP_NAME } from "@/lib/brand";
import { UserError } from "@/server/doc";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import { getTeam } from "@/server/teams";
import "../../pages.css";

export const metadata: Metadata = { title: `Team | ${APP_NAME}`, robots: { index: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Body({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const u = await currentUser();
  if (!u) redirect(`/login?next=/teams/${id}`);
  let t;
  try { t = await getTeam(u.id, id); } catch (e) { if (e instanceof UserError) notFound(); throw e; }
  const plan = await getPlan(u.id);
  return (
    <>
      <AppHeader user={u} plan={plan} here="teams" />
      <main className="pm">
        <p className="crumb"><Link href="/teams">Teams</Link></p>
        <h1>{t.name}</h1>
        <p className="lede">Owner: {t.owner?.name ?? "Unknown"} · You are {t.level === "owner" ? "the owner" : `an ${t.level}`}. <Link href="/designs">See this team&apos;s designs</Link></p>
        <TeamManager
          teamId={t.id} isOwner={t.level === "owner"} me={u.id}
          members={t.members.map((m) => ({ userId: m.userId, name: m.name, role: m.role }))}
          invites={t.invites.map((i) => ({ id: i.id, role: i.role, expiresAt: i.expiresAt.toISOString() }))}
        />
      </main>
    </>
  );
}

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="pm" aria-busy="true" />}><Body params={params} /></Suspense>;
}

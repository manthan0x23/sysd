import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/pages/PageSkeleton";
import { CreateTeamForm } from "@/components/pages/TeamForms";
import { APP_NAME } from "@/lib/brand";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import { Avatar } from "@/components/Avatar";
import { listTeams } from "@/server/teams";

export const metadata: Metadata = { title: `Teams | ${APP_NAME}` };

async function Body() {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login?next=/teams");
  const [plan, teams] = await Promise.all([getPlan(u.id), listTeams(u.id)]);
  return (
    <>
      <main className="pm">
        <h1>Teams</h1>
        <p className="lede">Share designs with the people you work with. Members are viewers or editors.</p>
        {teams.length > 0 && (
          <ul className="list">
            {teams.map((t) => (
              <li key={t.id}><Link href={`/teams/${t.id}`} className="list-main"><Avatar value={t.logo} name={t.name} size={30} /><b>{t.name}</b><small>{t.level}</small></Link></li>
            ))}
          </ul>
        )}
        <h2>Start a team</h2>
        {plan === "pro" ? <CreateTeamForm /> : (
          <p className="gate">Teams are part of the Pro plan. Pro is not open for sign-up yet. People you are invited by can still join their teams at no charge.</p>
        )}
      </main>
    </>
  );
}

export default function TeamsPage() {
  return <Suspense fallback={<PageSkeleton rows={2} />}><Body /></Suspense>;
}

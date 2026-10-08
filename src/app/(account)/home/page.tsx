import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { DesignCards } from "@/components/pages/DesignCards";
import { PageSkeleton } from "@/components/pages/PageSkeleton";
import { APP_NAME } from "@/lib/brand";
import { listDesigns } from "@/server/designs";
import { getPlan } from "@/server/plans";
import { needsWelcome } from "@/server/profile";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: `Home | ${APP_NAME}` };

async function Body() {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login?next=/home");
  if (await needsWelcome(u.id)) redirect("/welcome");
  const [data, plan] = await Promise.all([listDesigns(u.id), getPlan(u.id)]);
  const first = u.name.split(" ")[0];
  return (
    <main className="pm wide">
      <div className="pm-top">
        <div>
          <h1>Welcome back, {first}</h1>
          <p className="lede" style={{ margin: "6px 0 0" }}>Pick up a design, or start a new one.</p>
        </div>
      </div>

      <h2>Your designs</h2>
      <DesignCards rows={data.personal} canDelete withNew />

      <h2>Teams <span className="pro-tag">Pro</span></h2>
      {data.teams.length > 0 && data.teams.map((g) => (
        <section key={g.team.id} className="team-group">
          <h3><Link href={`/teams/${g.team.id}`}>{g.team.name}</Link> <small>{g.level}</small></h3>
          <DesignCards rows={g.designs} canDelete={g.level === "owner"} />
        </section>
      ))}
      {plan === "pro" ? (
        <p className="lede"><Link href="/teams">{data.teams.length ? "Manage your teams" : "Start a team"}</Link>{data.teams.length ? "" : " to share designs with people you work with."}</p>
      ) : (
        <div className="premium">
          <Lock size={18} aria-hidden />
          <div>
            <b>Teams are part of Pro</b>
            <p>Invite people as viewers or editors and keep your designs together in one place. Pro is not open for sign-up yet.{data.teams.length ? "" : " If someone invites you to their team, you can join at no charge."}</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function HomePage() {
  return <Suspense fallback={<PageSkeleton />}><Body /></Suspense>;
}

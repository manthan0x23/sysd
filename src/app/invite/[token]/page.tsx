import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/pages/AppHeader";
import { AcceptInvite } from "@/components/pages/TeamForms";
import { APP_NAME } from "@/lib/brand";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import { previewInvite } from "@/server/teams";
import "../../pages.css";

export const metadata: Metadata = { title: `Team invite | ${APP_NAME}`, robots: { index: false, follow: false } };

async function Body({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const u = await currentUser();
  if (!u) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);
  const [plan, invite] = await Promise.all([getPlan(u.id), previewInvite(token)]);
  return (
    <>
      <AppHeader user={u} plan={plan} here="invite" />
      <main className="pm narrow">
        {invite ? (
          <>
            <h1>Join {invite.teamName}</h1>
            <p className="lede">You were invited as {invite.role === "editor" ? "an editor, so you can change the team's designs" : "a viewer, so you can look at the team's designs but not change them"}. Joining is free.</p>
            <AcceptInvite token={token} />
          </>
        ) : (
          <>
            <h1>This invite no longer works</h1>
            <p className="lede">It may have been used, cancelled or expired. Ask the team owner for a new link.</p>
            <Link className="btn-sm" href="/designs">Go to your designs</Link>
          </>
        )}
      </main>
    </>
  );
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<main className="pm narrow" aria-busy="true" />}><Body params={params} /></Suspense>;
}

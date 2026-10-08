import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/pages/PageSkeleton";
import { AcceptInvite } from "@/components/pages/TeamForms";
import { APP_NAME } from "@/lib/brand";
import { currentUser } from "@/server/session";
import { previewInvite } from "@/server/teams";

export const metadata: Metadata = { title: `Team invite | ${APP_NAME}`, robots: { index: false, follow: false } };

async function Body({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const u = await currentUser();
  if (!u) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);
  const invite = await previewInvite(token);
  return (
    <>
      <main className="pm narrow">
        {invite ? (
          <>
            <h1>Join {invite.teamName}</h1>
            <p className="lede">You were invited as {invite.role === "editor" ? "an editor, so you can change the team's designs" : "a viewer, so you can look at the team's designs but not change them"}. Joining costs nothing.</p>
            <AcceptInvite token={token} />
          </>
        ) : (
          <>
            <h1>This invite no longer works</h1>
            <p className="lede">It may have been used, cancelled or expired. Ask the team owner for a new link.</p>
            <Link className="btn-sm" href="/home">Go home</Link>
          </>
        )}
      </main>
    </>
  );
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <Suspense fallback={<PageSkeleton narrow rows={1} />}><Body params={params} /></Suspense>;
}

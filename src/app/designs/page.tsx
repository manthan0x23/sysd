import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/pages/AppHeader";
import { DesignActions } from "@/components/pages/DesignActions";
import { APP_NAME } from "@/lib/brand";
import { listDesigns, type DesignRow } from "@/server/designs";
import { getPlan } from "@/server/plans";
import { currentUser } from "@/server/session";
import "../pages.css";

export const metadata: Metadata = { title: `Designs | ${APP_NAME}` };

const when = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Rows({ rows, canDelete }: { rows: DesignRow[]; canDelete: boolean }) {
  if (!rows.length) return <p className="empty-note">Nothing here yet.</p>;
  return (
    <ul className="list">
      {rows.map((d) => (
        <li key={d.id}>
          <Link href={`/app/d/${d.id}`} className="list-main">
            <b>{d.title}</b>
            <span className={`status ${d.status}`}>{d.status === "draft" ? "Draft" : "Saved"}</span>
            <small>Edited {when(d.updatedAt)}{d.ownerName ? ` · ${d.ownerName}` : ""}</small>
          </Link>
          <DesignActions id={d.id} canDelete={canDelete} />
        </li>
      ))}
    </ul>
  );
}

async function Body() {
  await connection();
  const u = await currentUser();
  if (!u) redirect("/login?next=/designs");
  const [data, plan] = await Promise.all([listDesigns(u.id), getPlan(u.id)]);
  return (
    <>
      <AppHeader user={u} plan={plan} here="designs" />
      <main className="pm">
        <div className="pm-top">
          <h1>Your designs</h1>
          <Link className="btn-sm" href="/app?fresh=n">New design</Link>
        </div>
        <Rows rows={data.personal} canDelete />
        {data.teams.map((g) => (
          <section key={g.team.id}>
            <h2><Link href={`/teams/${g.team.id}`}>{g.team.name}</Link> <small>{g.level}</small></h2>
            <Rows rows={g.designs} canDelete={g.level === "owner"} />
          </section>
        ))}
      </main>
    </>
  );
}

export default function DesignsPage() {
  return <Suspense fallback={<main className="pm" aria-busy="true" />}><Body /></Suspense>;
}

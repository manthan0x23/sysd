import Link from "next/link";
import { Plus } from "lucide-react";
import type { DesignRow } from "@/server/designs";
import { DesignActions } from "./DesignActions";

const when = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** The saved preview, inlined so it follows light and dark mode. It is drawn by our own server code from validated data. */
function Thumb({ svg }: { svg: string | null }) {
  return svg ? <div className="thumb-art" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="thumb-empty">No preview yet</div>;
}

export function DesignCards({ rows, canDelete, withNew }: { rows: DesignRow[]; canDelete: boolean; withNew?: boolean }) {
  if (!rows.length && !withNew) return <p className="empty-note">Nothing here yet.</p>;
  return (
    <ul className="dgrid">
      {withNew && (
        <li className="dcard new">
          <Link href="/app?fresh=n" className="tile-new"><Plus size={22} aria-hidden /><b>New design</b><small>Start from the sample system</small></Link>
        </li>
      )}
      {rows.map((d) => (
        <li key={d.id} className="dcard">
          <Link href={`/app/d/${d.id}`} className="thumb" aria-label={`Open ${d.title}`}><Thumb svg={d.thumb} /></Link>
          <div className="dcard-body">
            <Link href={`/app/d/${d.id}`} className="dcard-title"><b>{d.title}</b></Link>
            <span className={`status ${d.status}`}>{d.status === "draft" ? "Draft" : "Saved"}</span>
            <small>Edited {when(d.updatedAt)}{d.ownerName ? ` · ${d.ownerName}` : ""}</small>
            <DesignActions id={d.id} canDelete={canDelete} />
          </div>
        </li>
      ))}
    </ul>
  );
}

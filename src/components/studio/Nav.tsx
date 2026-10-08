"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, FilePlus2, FolderOpen, RotateCcw } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { duplicateDesignAction } from "@/app/actions/designs";
import { copySharedAction } from "@/app/actions/shares";
import { Logo } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";
import { toDoc } from "@/lib/doc";
import { useStudio } from "@/store/useStudio";
import { ShareButton } from "./ShareButton";
import type { StudioUser } from "./Studio";
import { ThemeToggle } from "./ThemeToggle";
import { saveNow } from "./useAutosave";

function SyncNote({ dirty }: { dirty: boolean }) {
  const d = useStudio((s) => s.design);
  if (d.shared) return <span className="sync">Shared with you · view only</span>;
  if (d.level === "view") return <span className="sync">View only</span>;
  if (d.sync === "saving") return <span className="sync busy">Saving…</span>;
  if (d.sync === "conflict") return <span className="sync warn" role="alert">Changed elsewhere · <button className="link" onClick={() => location.reload()}>reload</button></span>;
  if (d.sync === "error") return <span className="sync warn" role="alert" title={d.error ?? ""}>Could not save · <button className="link" onClick={() => void saveNow()}>retry</button></span>;
  if (!d.id) return <span className="sync">Not saved yet</span>;
  return <span className="sync">{dirty ? "Unsaved changes" : "All changes saved"}</span>;
}

export function Nav({ user, dirty, shareToken }: { user: StudioUser; dirty: boolean; shareToken?: string }) {
  const router = useRouter();
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const reset = useStudio((s) => s.reset);
  const design = useStudio((s) => s.design);
  const setTitle = useStudio((s) => s.setTitle);
  const setStatus = useStudio((s) => s.setStatus);
  const readOnly = design.shared || design.level === "view";

  const exportJson = () => {
    const { nodes, edges, workload } = useStudio.getState();
    const url = URL.createObjectURL(new Blob([JSON.stringify(toDoc(nodes, edges, workload), null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${design.title.replace(/[^\w-]+/g, "-") || "design"}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const copyDesign = async () => {
    const r = shareToken ? await copySharedAction(shareToken) : design.id ? await duplicateDesignAction(design.id) : null;
    if (r?.ok) router.push(`/app/d/${r.data.id}`);
  };

  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className="logo" aria-label={`${APP_NAME} home`}><Logo size={24} />{APP_NAME}</Link>
      <div className="seg" role="group" aria-label="Mode">
        <button aria-pressed={mode === "design"} onClick={() => setMode("design")}>Design</button>
        <button aria-pressed={mode === "learn"} onClick={() => setMode("learn")}>Learn</button>
      </div>
      <span className="grow" />
      <div className="titlebox">
        <input className="title" value={design.title} maxLength={80} readOnly={readOnly} aria-label="Design title" onChange={(e) => setTitle(e.target.value)} />
        {!readOnly && (
          <button className={`status ${design.status}`} onClick={() => setStatus(design.status === "draft" ? "saved" : "draft")} title="Click to switch between draft and saved">{design.status === "draft" ? "Draft" : "Saved"}</button>
        )}
        <SyncNote dirty={dirty} />
      </div>
      <span className="grow" />
      {!readOnly && <button className="tb" onClick={() => void saveNow("draft")} title="Save as a draft">Save draft</button>}
      {!readOnly && <button className="btn-sm" onClick={() => void saveNow("saved")} title="Save (Ctrl+S)">Save</button>}
      {!readOnly && <ShareButton />}
      {readOnly && <button className="btn-sm" onClick={copyDesign}><Copy className="ic" size={14} aria-hidden />Make a copy</button>}
      <Link className="tb" href="/designs" title="My designs"><FolderOpen className="ic" size={15} aria-hidden /><span className="lbl">Designs</span></Link>
      <button className="tb" onClick={() => router.push(`/app?fresh=${Date.now().toString(36)}`)} title="New design" aria-label="New design"><FilePlus2 className="ic" size={15} aria-hidden /></button>
      {!design.id && !readOnly && <button className="tb" onClick={reset} title="Reset the sample" aria-label="Reset the sample"><RotateCcw className="ic" size={15} aria-hidden /></button>}
      <button className="tb" onClick={exportJson} title="Export JSON" aria-label="Export JSON"><Download className="ic" size={15} aria-hidden /></button>
      <ThemeToggle />
      <form action={signOutAction} className="acct">
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar comes from GitHub/Google, so there is no fixed host to allow-list */}
        {user.image ? <img src={user.image} alt="" width={26} height={26} referrerPolicy="no-referrer" /> : <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>}
        <button className="tb" type="submit">Sign out</button>
      </form>
    </nav>
  );
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { duplicateDesignAction } from "@/app/actions/designs";
import { copySharedAction } from "@/app/actions/shares";
import { Logo } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";
import { useStudio } from "@/store/useStudio";
import { ShareButton } from "./ShareButton";
import type { StudioUser } from "./Studio";
import { saveNow } from "./useAutosave";

/**
 * A small island, centred at the top, with the logo, the name and your picture. Hover it, focus it, or click the
 * name and it opens outward in both directions: breadcrumb and title to the left, status, Save and Share to the
 * right. Collapsed, a dot still tells you whether everything is saved.
 */
export function TopIsland({ user, plan, dirty, shareToken }: { user: StudioUser; plan: "free" | "pro"; dirty: boolean; shareToken?: string }) {
  const router = useRouter();
  const design = useStudio((s) => s.design);
  const setTitle = useStudio((s) => s.setTitle);
  const setStatus = useStudio((s) => s.setStatus);
  const readOnly = design.shared || design.level === "view";
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focus, setFocus] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menu, setMenu] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const open = hover || pinned || focus || sharing || menu;
  const pro = plan === "pro";

  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [menu]);

  const enter = () => { clearTimeout(timer.current); setHover(true); };
  const leave = () => { timer.current = setTimeout(() => setHover(false), 320); };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setPinned(false); setFocus(false); setHover(false); setMenu(false); (document.activeElement as HTMLElement | null)?.blur(); } };

  const state = design.sync === "conflict" || design.sync === "error" ? "warn" : design.sync === "saving" || dirty ? "busy" : design.id ? "ok" : "new";
  const stateText = design.shared ? "Shared with you, view only" : design.level === "view" ? "View only" : design.sync === "saving" ? "Saving…" : design.sync === "conflict" ? "Changed elsewhere" : design.sync === "error" ? "Could not save" : !design.id ? "Not saved yet" : dirty ? "Unsaved changes" : "All changes saved";

  const copyDesign = async () => {
    const r = shareToken ? await copySharedAction(shareToken) : design.id ? await duplicateDesignAction(design.id) : null;
    if (r?.ok) router.push(`/app/d/${r.data.id}`);
  };

  return (
    <div ref={root} className={`island top-island ${open ? "open" : ""}`} onPointerEnter={enter} onPointerLeave={leave} onFocus={() => setFocus(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false); }} onKeyDown={onKey}>
      <div className="wing wing-l" inert={!open} aria-hidden={!open}>
        <div className="wing-in">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/home">Home</Link><span aria-hidden>/</span></nav>
          <input className="title" value={design.title} maxLength={80} readOnly={readOnly} aria-label="Design title" onChange={(e) => setTitle(e.target.value)} />
          {!readOnly && <button className={`status ${design.status}`} onClick={() => setStatus(design.status === "draft" ? "saved" : "draft")} title="Click to switch between draft and saved">{design.status === "draft" ? "Draft" : "Saved"}</button>}
        </div>
      </div>

      <button className="top-brand" aria-expanded={open} aria-label={`${APP_NAME}: ${design.title}. ${stateText}. Press to ${pinned ? "collapse" : "keep open"}`} onClick={() => setPinned((p) => !p)}>
        <Logo size={24} /><span>{APP_NAME}</span><i className={`dot ${state}`} aria-hidden />
      </button>

      <div className="acct-wrap">
        <button className="avatar-btn" aria-label={`Account: ${user.name}`} aria-haspopup="menu" aria-expanded={menu} title={user.name} onClick={() => setMenu((m) => !m)}>
          {user.image
            // eslint-disable-next-line @next/next/no-img-element -- avatar comes from GitHub/Google, so there is no fixed host to allow-list
            ? <img src={user.image} alt="" width={30} height={30} referrerPolicy="no-referrer" className="avatar-img" />
            : <span className="avatar big">{user.name.slice(0, 1).toUpperCase()}</span>}
        </button>
        {menu && (
          <div className="menu-pop down" role="menu">
            <p className="menu-h"><b>{user.name}</b><span className={`ph-plan ${plan}`}>{pro ? "Pro" : "Free"}</span></p>
            {!pro && <Link role="menuitem" className="mi" href="/upgrade"><b>Upgrade to Pro</b><small>AI agent, teams and exports</small></Link>}
            <Link role="menuitem" className="mi" href="/home"><b>Home</b><small>All your designs</small></Link>
            <Link role="menuitem" className="mi" href="/teams"><b>Teams</b><small>{pro ? "Manage your teams" : "Join or view teams"}</small></Link>
            <form action={signOutAction}><button role="menuitem" className="mi" type="submit"><b>Sign out</b></button></form>
          </div>
        )}
      </div>

      <div className="wing wing-r" inert={!open} aria-hidden={!open}>
        <div className="wing-in">
          <span className={`sync ${state === "busy" ? "busy" : state === "warn" ? "warn" : ""}`} role={state === "warn" ? "alert" : undefined}>
            {stateText}
            {design.sync === "conflict" && <> · <button className="link" onClick={() => location.reload()}>reload</button></>}
            {design.sync === "error" && <> · <button className="link" onClick={() => void saveNow()}>retry</button></>}
          </span>
          {!readOnly && <ShareButton onOpenChange={setSharing} />}
          {readOnly && <button className="btn-sm" onClick={copyDesign}><Copy className="ic" size={14} aria-hidden />Make a copy</button>}
        </div>
      </div>
    </div>
  );
}

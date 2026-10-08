"use client";

import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { Download, RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";
import { useStudio } from "@/store/useStudio";
import { ThemeToggle } from "./ThemeToggle";
import type { StudioUser } from "./Studio";

export function Nav({ user }: { user: StudioUser }) {
  const mode = useStudio((s) => s.mode);
  const setMode = useStudio((s) => s.setMode);
  const reset = useStudio((s) => s.reset);

  const exportJson = () => {
    const { nodes, edges, workload } = useStudio.getState();
    const doc = {
      version: 2,
      workload,
      nodes: nodes.map((n) => ({ id: n.id, type: n.data.typeId, name: n.data.name, icon: n.data.icon, offering: n.data.offeringId, plan: n.data.planId, custom: n.data.custom, parent: n.parentId, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      edges: edges.map((e) => ({ from: e.source, to: e.target })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "design.json" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className="logo" aria-label={`${APP_NAME} home`}><Logo size={24} />{APP_NAME}</Link>
      <div className="seg" role="group" aria-label="Mode">
        <button aria-pressed={mode === "design"} onClick={() => setMode("design")}>Design</button>
        <button aria-pressed={mode === "learn"} onClick={() => setMode("learn")}>Learn</button>
      </div>
      <span className="grow" />
      <span className="proj">Untitled design</span>
      <span className="grow" />
      <button className="tb" onClick={reset}><RotateCcw className="ic" size={15} aria-hidden />Reset</button>
      <button className="tb" onClick={exportJson}><Download className="ic" size={15} aria-hidden />Export JSON</button>
      <ThemeToggle />
      <form action={signOutAction} className="acct">
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar comes from GitHub/Google, so there is no fixed host to allow-list */}
        {user.image ? <img src={user.image} alt="" width={26} height={26} referrerPolicy="no-referrer" /> : <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>}
        <span className="acct-name">{user.name}</span>
        <button className="tb" type="submit">Sign out</button>
      </form>
    </nav>
  );
}

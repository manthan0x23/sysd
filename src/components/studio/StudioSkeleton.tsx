import Link from "next/link";
import { Logo } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";

/**
 * The canvas page's shell while it loads: the real top bar and panel outlines, so moving from another
 * page into the canvas does not flash an empty screen.
 */
export function StudioSkeleton() {
  return (
    <div className="studio" aria-busy="true" aria-label="Loading the canvas">
      <nav className="nav" aria-label="Main">
        <Link href="/" className="logo" aria-label={`${APP_NAME} home`}><Logo size={24} />{APP_NAME}</Link>
        <span className="skel sk-seg" aria-hidden />
        <span className="grow" />
        <span className="skel sk-nav-title" aria-hidden />
        <span className="grow" />
        <Link className="tb" href="/home">Home</Link>
      </nav>
      <aside className="panel left" aria-hidden><span className="skel sk-search" /><span className="skel sk-row" /><span className="skel sk-row" /><span className="skel sk-row" /><span className="skel sk-row" /></aside>
      <aside className="panel right" aria-hidden><span className="skel sk-card-r" /><span className="skel sk-card-r" /></aside>
    </div>
  );
}

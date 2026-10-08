"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

const LINKS = [["Home", "/home"], ["Teams", "/teams"]] as const;

/** Static links that stay on screen while pages load; only the current one is highlighted. */
function Links({ path }: { path: string }) {
  return (
    <nav aria-label="Account">
      {LINKS.map(([label, href]) => (
        <Link key={href} href={href} className="ph-link" aria-current={path === href || path.startsWith(href + "/") ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

function Current() {
  return <Links path={usePathname()} />;
}

/** usePathname reads the live URL, so it sits in Suspense; the plain links show first, then the current one lights up. */
export function NavLinks() {
  return <Suspense fallback={<Links path="" />}><Current /></Suspense>;
}

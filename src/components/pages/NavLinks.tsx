"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["Home", "/home"], ["Teams", "/teams"]] as const;

/** Static links that stay on screen while pages load; only the current one is highlighted. */
export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Account">
      {LINKS.map(([label, href]) => (
        <Link key={href} href={href} className="ph-link" aria-current={path === href || path.startsWith(href + "/") ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}

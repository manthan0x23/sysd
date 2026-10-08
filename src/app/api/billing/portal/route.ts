import { NextResponse } from "next/server";
import { UserError } from "@/server/doc";
import { portalUrl } from "@/server/billing";
import { currentUser } from "@/server/session";

/** Sends the signed-in user to their own billing portal. The customer id comes from our database, never the URL. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.redirect(new URL("/login?next=/upgrade", req.url));
  try { return NextResponse.redirect(await portalUrl(u.id)); }
  catch (e) {
    console.error("portal failed", e);
    return NextResponse.redirect(new URL(`/upgrade?billing=${e instanceof UserError ? "none" : "error"}`, req.url));
  }
}

import { auth } from "@/auth";
import { UserError } from "./doc";
import { getUser } from "./users";

export interface SessionUser { id: string; name: string; image: string | null }

/** The signed-in profile, or null. A session without a database id (older sign-ins) counts as signed out. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const u = await getUser(id);
  return u ? { id: u.id, name: u.name ?? u.email ?? "Account", image: u.image } : null;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new UserError("Your session has ended. Sign in again.");
  return u;
}

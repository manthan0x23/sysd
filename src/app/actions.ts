"use server";

import { signIn, signOut } from "@/auth";
import { safeNext } from "@/lib/safeNext";

const ALLOWED = new Set(["github", "google"]);

export async function signInWith(provider: string, next?: string) {
  if (!ALLOWED.has(provider)) throw new Error("Unsupported sign-in provider");
  await signIn(provider, { redirectTo: safeNext(next) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

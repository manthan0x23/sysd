"use server";

import { signIn, signOut } from "@/auth";

const ALLOWED = new Set(["github", "google"]);

export async function signInWith(provider: string) {
  if (!ALLOWED.has(provider)) throw new Error("Unsupported sign-in provider");
  await signIn(provider, { redirectTo: "/app" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

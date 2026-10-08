import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Sign-in is GitHub or Google only: no passwords, no email sign-up, no magic links.
 * Sessions are signed JWT cookies, so there is no user database to run or secure yet.
 * Credentials come from AUTH_GITHUB_ID/SECRET and AUTH_GOOGLE_ID/SECRET (see .env.example).
 */
export const PROVIDERS = [
  { id: "github", name: "GitHub", configured: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) },
  { id: "google", name: "Google", configured: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) },
] as const;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub, Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
});

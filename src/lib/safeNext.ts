/** Only same-site paths, so a crafted link cannot send someone to another site after signing in. */
export const safeNext = (n: string | undefined | null) => (n && /^\/(?!\/)[\w\-./?=&%~]*$/.test(n) ? n : "/app");

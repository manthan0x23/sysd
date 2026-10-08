/** Only same-site paths, so a crafted link cannot send someone to another site after signing in. Default is the home page. */
export const safeNext = (n: string | undefined | null) => (n && /^\/(?!\/)[\w\-./?=&%~]*$/.test(n) ? n : "/home");

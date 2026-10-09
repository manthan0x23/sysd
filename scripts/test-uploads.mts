// Offline checks for custom avatar uploads: presigning and key rules need no network or real R2 keys.
process.env.R2_ACCOUNT_ID = "acct123"; process.env.R2_ACCESS_KEY_ID = "AKIATEST"; process.env.R2_SECRET_ACCESS_KEY = "secret";
process.env.R2_BUCKET = "sysd-test"; process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://img.example.com";
const { requestUpload, keyBelongsTo } = await import("../src/server/uploads");
const { parseAvatar } = await import("../src/lib/avatar");

let bad = 0;
const ok = (name: string, cond: boolean, extra?: unknown) => { if (!cond) { bad++; console.log("FAIL", name, extra ?? ""); } };
const rejects = async (name: string, p: Promise<unknown>) => { try { await p; bad++; console.log("FAIL should reject:", name); } catch { /* expected */ } };
const USER = "11111111-1111-4111-8111-111111111111";

const t = await requestUpload(USER, { scope: "avatar" }, "image/webp", 20_000);
const u = new URL(t.url);
ok("endpoint is the account's R2 host", u.host === "sysd-test.acct123.r2.cloudflarestorage.com" || u.host === "acct123.r2.cloudflarestorage.com", u.host);
ok("key is under the user's folder", t.key.startsWith(`avatars/${USER}/`) && t.key.endsWith(".webp"), t.key);
ok("url is signed and short-lived", u.searchParams.get("X-Amz-Expires") === "300" && Boolean(u.searchParams.get("X-Amz-Signature")));
ok("content-type and length are signed", (u.searchParams.get("X-Amz-SignedHeaders") ?? "").includes("content-type") && (u.searchParams.get("X-Amz-SignedHeaders") ?? "").includes("content-length"), u.searchParams.get("X-Amz-SignedHeaders"));
ok("no credentials in the url", !t.url.includes("secret"));

await rejects("svg", requestUpload(USER, { scope: "avatar" }, "image/svg+xml", 1000));
await rejects("html", requestUpload(USER, { scope: "avatar" }, "text/html", 1000));
await rejects("too big", requestUpload(USER, { scope: "avatar" }, "image/png", 300 * 1024));
await rejects("zero bytes", requestUpload(USER, { scope: "avatar" }, "image/png", 0));
await rejects("fractional size", requestUpload(USER, { scope: "avatar" }, "image/png", 10.5));

ok("own key accepted", keyBelongsTo(t.key, { scope: "avatar" }, USER));
ok("someone else's key refused", !keyBelongsTo(t.key, { scope: "avatar" }, "22222222-2222-4222-8222-222222222222"));
ok("avatar key refused for a team", !keyBelongsTo(t.key, { scope: "team", teamId: USER }, USER));
ok("path tricks refused", !keyBelongsTo(`avatars/${USER}/../x.png`, { scope: "avatar" }, USER) && !keyBelongsTo(`avatars/${USER}/${"a".repeat(32)}.svg`, { scope: "avatar" }, USER));
ok("avatar spec parses", parseAvatar(`u:${t.key}`)?.kind === "upload");
ok("bad upload spec refused", parseAvatar("u:avatars/x/y.png") === null && parseAvatar("u:https://evil.example/a.png") === null);

console.log(bad ? `${bad} problem(s)` : "all checks passed");
process.exit(bad ? 1 : 0);

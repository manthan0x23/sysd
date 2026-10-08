// Grants or removes Pro by email until there is a payment flow.
//   npm run plan -- you@example.com pro            (local Docker database)
//   DATABASE_URL=<neon url> npm run plan -- you@example.com pro   (production)
// Optional third argument: days until it expires, e.g. `pro 30`. Without it Pro does not expire.
import postgres from "postgres";

try { process.loadEnvFile(".env.local"); } catch { /* production sets real env vars */ }
const [email, plan, days] = process.argv.slice(2);
if (!email || !["free", "pro"].includes(plan)) { console.error("usage: npm run plan -- <email> <free|pro> [days]"); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set."); process.exit(1); }

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const expires = plan === "pro" && days ? new Date(Date.now() + Number(days) * 86_400_000) : null;
const rows = await sql`update users set plan = ${plan}, plan_expires_at = ${expires} where lower(email) = lower(${email}) returning id, name`;
await sql.end();
if (!rows.length) { console.error(`No user with email ${email}. Sign in once first, then run this again.`); process.exit(1); }
console.log(`${rows.length} user(s) set to ${plan}${expires ? ` until ${expires.toISOString().slice(0, 10)}` : ""}.`);

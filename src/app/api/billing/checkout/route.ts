import { NextResponse } from "next/server";
import { z } from "zod";
import { UserError } from "@/server/doc";
import { startCheckout } from "@/server/billing";
import { currentUser } from "@/server/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const Body = z.object({ interval: z.enum(["month", "year"]), currency: z.enum(["USD", "INR"]) });

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const b = Body.parse(await req.json());
    const [row] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, u.id)).limit(1);
    const url = await startCheckout({ id: u.id, name: u.name, email: row?.email ?? null }, b.interval, b.currency, `${new URL(req.url).origin}/upgrade?checkout=done`);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Bad request." }, { status: 400 });
    console.error("checkout failed", e);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/server/session";
import { requireFeature } from "@/server/plans";
import { parseDoc, UserError } from "@/server/doc";
import { ensureShare } from "@/server/shares";
import { csv, reportHtml, svg, xlsx } from "@/server/exports";

const Body = z.object({ format: z.enum(["png", "svg", "report", "csv", "json", "xlsx"]), title: z.string().max(80), doc: z.unknown(), designId: z.string().uuid().optional() });

const hits = new Map<string, number[]>();
const limited = (id: string) => {
  const now = Date.now(), recent = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
  recent.push(now); hits.set(id, recent);
  return recent.length > 20;
};

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to export." }, { status: 401 });
  try {
    await requireFeature(user.id, "exports");
    if (limited(user.id)) return NextResponse.json({ error: "Too many exports. Try again in a minute." }, { status: 429 });
    const b = Body.parse(await req.json());
    const doc = parseDoc(b.doc);
    const title = b.title.trim() || "Design";
    switch (b.format) {
      case "png": case "svg": return new NextResponse(svg(doc, title), { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
      case "report": return new NextResponse(reportHtml(doc, title), { headers: { "content-type": "text/html; charset=utf-8" } });
      case "csv": return new NextResponse(csv(doc), { headers: { "content-type": "text/csv; charset=utf-8" } });
      case "json": return new NextResponse(JSON.stringify({ title, ...doc }, null, 2), { headers: { "content-type": "application/json" } });
      case "xlsx": {
        const token = b.designId ? await ensureShare(user.id, b.designId) : null;
        const url = token ? `${new URL(req.url).origin}/s/${token}` : null;
        return new NextResponse(new Uint8Array(await xlsx(doc, title, url)), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
      }
    }
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Bad request." }, { status: 400 });
    console.error("export failed", e);
    return NextResponse.json({ error: "The export failed." }, { status: 500 });
  }
}

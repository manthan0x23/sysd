// Checks link routing on real designs: right angles only, ends on the handles, no link through a node or an
// unrelated server block, and a layout that keeps the verdict loop from pushing a server to the far right.
import { codeJudgeDoc } from "../src/lib/templates/codeJudge";
import { fromDoc } from "../src/lib/doc";
import { formatNodes } from "../src/lib/layout";
import { routeEdges, type Pt } from "../src/lib/route";
import { useStudio } from "../src/store/useStudio";
import type { StudioNode } from "../src/lib/model";

let bad = 0;
const fail = (m: string) => { bad++; console.log("FAIL", m); };

function abs(nodes: StudioNode[], n: StudioNode): { x: number; y: number } {
  const p = nodes.find((x) => x.id === n.parentId);
  const o = p ? abs(nodes, p) : { x: 0, y: 0 };
  return { x: o.x + n.position.x, y: o.y + n.position.y };
}
const size = (n: StudioNode) => (n.type === "host" ? { w: Number(n.style?.width), h: Number(n.style?.height) } : { w: 142, h: 64 });

function check(name: string, nodes: StudioNode[], edges: { id: string; source: string; target: string }[]) {
  const routes = routeEdges(nodes, edges as never);
  let bends = 0, long = 0;
  for (const e of edges) {
    const r: Pt[] | undefined = routes[e.id];
    if (!r) { fail(`${name}: no route for ${e.id}`); continue; }
    const s = nodes.find((n) => n.id === e.source)!, t = nodes.find((n) => n.id === e.target)!;
    const a = abs(nodes, s), b = abs(nodes, t), sa = size(s);
    if (r[0][0] !== a.x + sa.w || r[0][1] !== a.y + sa.h / 2) fail(`${name}: ${e.id} does not start on the source handle`);
    const end = r[r.length - 1];
    if (end[0] !== b.x || end[1] !== b.y + size(t).h / 2) fail(`${name}: ${e.id} does not end on the target handle`);
    bends += r.length - 2;
    for (let k = 0; k < r.length - 1; k++) {
      const [x1, y1] = r[k], [x2, y2] = r[k + 1];
      if (x1 !== x2 && y1 !== y2) fail(`${name}: ${e.id} has a diagonal segment`);
      long += Math.abs(x2 - x1) + Math.abs(y2 - y1);
      // through any card (other than touching its own handle side), or an unrelated server block
      for (const n of nodes) {
        const p = abs(nodes, n), z = size(n);
        const lo = { x: Math.min(x1, x2), y: Math.min(y1, y2) }, hi = { x: Math.max(x1, x2), y: Math.max(y1, y2) };
        const hit = hi.x > p.x && lo.x < p.x + z.w && hi.y > p.y && lo.y < p.y + z.h;
        if (!hit) continue;
        if (n.type !== "host") { fail(`${name}: ${e.id} crosses card ${n.id}`); continue; }
        const related = (id: string) => { for (let c = nodes.find((x) => x.id === id); c; c = nodes.find((x) => x.id === c!.parentId)) if (c.id === n.id) return true; return false; };
        if (!related(e.source) && !related(e.target)) fail(`${name}: ${e.id} runs through server block ${n.id}`);
      }
    }
  }
  console.log(`${name}: ${edges.length} links, ${bends} bends, ${long} px of line`);
}

// the code judge, laid out
{
  const d = fromDoc(codeJudgeDoc());
  check("code judge", d.nodes, d.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));
  const x = (id: string) => abs(d.nodes, d.nodes.find((n) => n.id === id)!).x;
  // both app servers in the same column, ahead of the runner and the pub/sub
  if (Math.abs(x("app-srv-1") - x("app-srv-2")) > 1) fail("app servers should share a column");
  if (!(x("app-srv-1") < x("runner") && x("runner") < x("pubsub"))) fail("order should be servers, runner, pub/sub");
}
// the sample
{
  useStudio.getState().loadSample();
  useStudio.getState().formatLayout();
  const s = useStudio.getState();
  check("sample", s.nodes, s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })));
}
console.log(bad ? `${bad} problem(s)` : "all checks passed");
process.exit(bad ? 1 : 0);

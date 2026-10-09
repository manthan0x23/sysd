// Checks the Format layout action on the sample system: no overlaps, grid-aligned, links point right.
import { useStudio } from "../src/store/useStudio";

const st = useStudio.getState();
if (process.argv.includes("--nested")) {
  st.loadSample();
  const srv = useStudio.getState().addNode(process.argv[3] ?? "vps", { x: 900, y: 0 });
  const kid = (t: string, p: string) => useStudio.getState().addNode(t, { x: 5, y: 5 }, p);
  const a = kid("app", srv), b = kid("redis", srv), c = kid("postgres", srv);
  useStudio.setState((s) => ({ edges: [...s.edges, ...[[a, b], [a, c], ["lb", a]].map(([source, target]) => ({ id: `${source}-${target}`, source, target, type: "flow" }))] }));
}
st.formatLayout();
const { nodes, edges } = useStudio.getState();
const abs = (n: (typeof nodes)[number]): { x: number; y: number } => {
  const p = nodes.find((x) => x.id === n.parentId);
  const o = p ? abs(p) : { x: 0, y: 0 };
  return { x: o.x + n.position.x, y: o.y + n.position.y };
};
const size = (n: (typeof nodes)[number]) => n.type === "host" ? { w: Number(n.style?.width), h: Number(n.style?.height) } : { w: 142, h: 64 };
let bad = 0;
const fail = (m: string) => { bad++; console.log("FAIL", m); };
for (const n of nodes) {
  if (n.position.x % 11 || n.position.y % 11) fail(`${n.id} off grid ${JSON.stringify(n.position)}`);
  if (n.parentId) {
    const p = nodes.find((x) => x.id === n.parentId)!, a = n.position, s = size(n), ps = size(p);
    if (a.x < 0 || a.y < 0 || a.x + s.w > ps.w || a.y + s.h > ps.h) fail(`${n.id} outside host ${p.id}`);
  }
}
for (const a of nodes) for (const b of nodes) {
  if (a.id >= b.id || a.parentId !== b.parentId) continue;
  const pa = abs(a), pb = abs(b), sa = size(a), sb = size(b);
  if (pa.x < pb.x + sb.w && pb.x < pa.x + sa.w && pa.y < pb.y + sb.h && pb.y < pa.y + sa.h) fail(`${a.id} overlaps ${b.id}`);
}
let back = 0;
for (const e of edges) { const s = nodes.find((n) => n.id === e.source), t = nodes.find((n) => n.id === e.target); if (s && t && abs(t).x + size(t).w <= abs(s).x) back++; }
console.log(`${nodes.length} nodes, ${edges.length} links, ${back} links pointing left, ${bad} problems`);
for (const n of nodes) console.log(n.id.padEnd(12), (n.parentId ?? "-").padEnd(8), JSON.stringify(abs(n)));
process.exit(bad ? 1 : 0);

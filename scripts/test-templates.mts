// Every template must be a valid design: real offerings, legal links, a finished trace, and a sane bill.
import { TEMPLATES } from "../src/lib/templates";
import { OFFERING_BY_ID } from "../src/lib/catalog/offerings";
import { checkLink } from "../src/lib/catalog/connections";
import { fromDoc } from "../src/lib/doc";
import { analyze } from "../src/lib/analysis";
import { traceRequest } from "../src/lib/trace";

let bad = 0;
const ok = (name: string, cond: boolean, extra?: unknown) => { if (!cond) { bad++; console.log("FAIL", name, extra ?? ""); } };
for (const t of TEMPLATES) {
  const doc = t.doc();
  const ids = new Set(doc.nodes.map((n) => n.id));
  ok(`${t.id}: unique ids`, ids.size === doc.nodes.length);
  for (const n of doc.nodes) {
    if (n.offering) ok(`${t.id}: offering ${n.offering}`, Boolean(OFFERING_BY_ID[n.offering]) && OFFERING_BY_ID[n.offering].typeId === n.type, n.offering);
    if (n.parent) ok(`${t.id}: parent of ${n.id}`, ids.has(n.parent));
  }
  const type = new Map(doc.nodes.map((n) => [n.id, n.type]));
  for (const e of doc.edges) {
    ok(`${t.id}: link ${e.from}>${e.to} nodes exist`, ids.has(e.from) && ids.has(e.to));
    const c = checkLink(type.get(e.from)!, type.get(e.to)!);
    ok(`${t.id}: link ${e.from}>${e.to} legal`, c.ok, !c.ok && c.reason);
  }
  const d = fromDoc(doc);
  const a = analyze(d.nodes, d.edges, d.workload);
  const traces = (["read-hit", "read-miss", "write"] as const).map((k) => traceRequest(d.nodes, d.edges, a.sim, k));
  for (const tr of traces) ok(`${t.id}: ${tr.kind} has steps`, tr.steps.length > 3, tr.notes);
  console.log(`${t.level.padEnd(8)} ${t.id.padEnd(10)} ${String(doc.nodes.length).padStart(2)} nodes ${String(doc.edges.length).padStart(2)} links  $${Math.round(a.sim.cost)}/mo  hot: ${d.nodes.filter((n) => (a.sim.util[n.id] ?? 0) > 1).map((n) => n.id).join(",") || "-"}  steps ${traces.map((x) => x.steps.length).join("/")}  answer ${traces[1].answerMs}ms`);
}
console.log(bad ? `\n${bad} failed` : "\nall templates ok");
process.exit(bad ? 1 : 0);

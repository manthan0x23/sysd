// Traces one request through real designs and checks it follows the rules a lecture would teach.
import { useStudio } from "../src/store/useStudio";
import { analyze } from "../src/lib/analysis";
import { codeJudgeDoc } from "../src/lib/templates/codeJudge";
import { fromDoc } from "../src/lib/doc";
import { traceRequest, type TraceKind } from "../src/lib/trace";

let bad = 0;
const ok = (name: string, cond: boolean, extra?: unknown) => { if (!cond) { bad++; console.log("FAIL", name, extra ?? ""); } };
const show = (label: string, steps: ReturnType<typeof traceRequest>) => {
  console.log(`\n== ${label}: answer ${steps.answerMs} ms${steps.backgroundMs != null ? `, background done at ${steps.backgroundMs} ms` : ""}, ${steps.steps.length} steps`);
  for (const s of steps.steps) console.log(`${s.phase.padEnd(8)} ${String(s.at).padStart(6)} ms  ${s.title}`);
  for (const n of steps.notes) console.log("note:", n);
};

const judge = fromDoc(codeJudgeDoc());
const aj = analyze(judge.nodes, judge.edges, judge.workload);
const trace = (k: TraceKind) => traceRequest(judge.nodes, judge.edges, aj.sim, k);

const hit = trace("read-hit"), miss = trace("read-miss"), write = trace("write");
const titles = (t: typeof hit) => t.steps.map((s) => s.title).join(" | ");
ok("read hit asks the cache", /asks Redis cache/.test(titles(hit)));
ok("read hit never asks the database", !/Problems/.test(titles(hit)), titles(hit));
ok("read miss asks cache, then the database, then fills the cache", /asks Redis cache.*asks Problems.*fills Redis cache/.test(titles(miss)), titles(miss));
ok("write goes to the database", /writes to Problems/.test(titles(write)));
ok("write invalidates the cache", /invalidates Redis cache/.test(titles(write)));
ok("write enqueues work", /enqueues work on Submission queue/.test(titles(write)));
ok("write has background work after the answer", write.backgroundMs != null && write.backgroundMs > write.answerMs);
ok("read has no background work", hit.backgroundMs == null && miss.backgroundMs == null);
ok("a hit is faster than a miss", hit.answerMs < miss.answerMs, [hit.answerMs, miss.answerMs]);
ok("the result is pushed back to the browser", write.steps.some((s) => s.phase === "push"));
ok("every request starts at the client and comes back to it", hit.steps[0].from === "client" && hit.steps[hit.steps.length - 1].to === "client");
ok("time never goes backwards on one clock", write.steps.filter((s) => s.phase !== "async" && s.phase !== "push").every((s, i, a) => i === 0 || s.at >= a[i - 1].at));

// the sample has a CDN: reads enter through it
useStudio.getState().loadSample();
const s = useStudio.getState();
const as = analyze(s.nodes, s.edges, s.workload);
const sh = traceRequest(s.nodes, s.edges, as.sim, "read-hit");
ok("sample read hit is answered by the CDN", /answers from its cache/.test(sh.steps.map((x) => x.title).join("|")), sh.steps.map((x) => x.title));
const sm = traceRequest(s.nodes, s.edges, as.sim, "read-miss");
ok("sample CDN miss goes to the origin", /AWS S3|Storage/.test(sm.steps.map((x) => x.title).join("|")));
const sw = traceRequest(s.nodes, s.edges, as.sim, "write");
ok("sample write goes through the load balancer, not the CDN", /Load balancer/.test(sw.steps.map((x) => x.title).join("|")) && !/CDN/.test(sw.steps.slice(0, 3).map((x) => x.title).join("|")));

// an empty canvas explains itself
const empty = traceRequest([], [], as.sim, "write");
ok("empty design gives a note, not a crash", empty.steps.length === 0 && empty.notes.length > 0);

if (process.argv.includes("--show")) { show("judge, write", write); show("judge, read hit", hit); show("sample, read miss", sm); }
console.log(bad ? `${bad} problem(s)` : "all checks passed");
process.exit(bad ? 1 : 0);

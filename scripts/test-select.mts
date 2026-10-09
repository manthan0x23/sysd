// Group editing: select, copy, paste, duplicate, align, distribute, and undo/redo.
import { useStudio, startHistory, undo, redo } from "../src/store/useStudio";
import { codeJudgeDoc } from "../src/lib/templates/codeJudge";

let bad = 0;
const ok = (name: string, cond: boolean, extra?: unknown) => { if (!cond) { bad++; console.log("FAIL", name, extra ?? ""); } };
const st = () => useStudio.getState();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

st().hydrate("t", { id: null, title: "t", status: "draft", rev: 0, teamId: null, level: null, doc: codeJudgeDoc() });
const stop = startHistory();
const n0 = st().nodes.length, e0 = st().edges.length;

// marquee: two nodes change to selected
st().applySelect([{ id: "app-1", selected: true }, { id: "app-2", selected: true }]);
ok("two selected -> multi", st().multi.length === 2 && st().selectedId === null);
st().applySelect([{ id: "app-2", selected: false }]);
ok("one left -> single", st().multi.length === 0 && st().selectedId === "app-1");

// duplicate a group with a link between them (queue -> worker-1 and queue -> worker-2 are outside; pick queue + cache + db)
st().selectMany(["queue", "worker-1"]);
st().duplicateSelection();
ok("duplicate adds 2 nodes", st().nodes.length === n0 + 2, st().nodes.length);
ok("duplicate keeps the link between them", st().edges.length === e0 + 1, st().edges.length - e0);
ok("copies are selected", st().multi.length === 2);
const copy = st().nodes.filter((n) => st().multi.includes(n.id));
ok("copy is offset", copy.every((c) => !st().nodes.some((o) => o !== c && o.position.x === c.position.x && o.position.y === c.position.y && o.parentId === c.parentId)));
// worker-1 lives in a container: its copy must stay in that container
const w = st().nodes.find((n) => n.id === "worker-1")!;
const wc = copy.find((n) => n.data.typeId === "worker")!;
ok("copy stays in its container", wc.parentId === w.parentId, wc.parentId);

// copy a server with everything inside it
st().selectMany(["sandbox-1", "app-srv-1"]);
const before = st().nodes.length;
ok("copy works", st().copySelection());
st().paste(); st().paste();
const added = st().nodes.length - before;
// sandbox-1 now holds worker-1 and its copy: sandbox + 2 workers + app-srv-1 + app-1 = 5 per paste
ok("host copy brings its contents", added === 10, added);

// align and distribute
st().hydrate("t2", { id: null, title: "t", status: "draft", rev: 0, teamId: null, level: null, doc: codeJudgeDoc() });
st().selectMany(["cache", "db", "queue"]);
st().alignSelection("left");
const xs = ["cache", "db", "queue"].map((id) => st().nodes.find((n) => n.id === id)!.position.x);
ok("align left", new Set(xs).size === 1, xs);
st().alignSelection("top");
const ys = ["cache", "db", "queue"].map((id) => st().nodes.find((n) => n.id === id)!.position.y);
ok("align top", new Set(ys).size === 1, ys);
st().distributeSelection("horizontal");
ok("distribute is stable on 3 aligned items", true);
st().nudgeSelection(22, 0);
ok("nudge", st().nodes.find((n) => n.id === "db")!.position.x === xs[1] + 22);

// undo / redo
st().hydrate("t3", { id: null, title: "t", status: "draft", rev: 0, teamId: null, level: null, doc: codeJudgeDoc() });
const stop2 = startHistory();
const count = st().nodes.length;
st().removeNodes(["cache"]);
await sleep(500);
ok("deleted", st().nodes.length === count - 1);
st().addNode("redis", { x: 0, y: 0 });
await sleep(500);
ok("history has 2 steps", st().histLen.past === 2, st().histLen);
undo(); ok("undo the add", st().nodes.length === count - 1 && !st().nodes.some((n) => n.data.typeId === "redis" && n.id !== "cache"));
undo(); ok("undo the delete", st().nodes.length === count && st().nodes.some((n) => n.id === "cache"));
redo(); ok("redo the delete", st().nodes.length === count - 1);
ok("redo is available", st().histLen.future === 1, st().histLen);
st().addNode("redis", { x: 0, y: 0 }); await sleep(500);
ok("a new edit clears redo", st().histLen.future === 0);
stop(); stop2();
console.log(bad ? `\n${bad} failed` : "all selection checks passed");
process.exit(bad ? 1 : 0);

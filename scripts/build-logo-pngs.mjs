// Renders the Sysd mark to the PNG sizes that GitHub, Google and browsers ask for.
// Run: node scripts/build-logo-pngs.mjs   (needs google-chrome and the dev server is NOT required)
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const svg = readFileSync("public/logo.svg", "utf8").replace(/width="32" height="32"/, 'width="100%" height="100%"');
const PORT = 9360;
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "logo-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 40 && !target; i++) { try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json(); } catch { await sleep(250); } }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");

// name, pixel size, background (null = transparent), logo scale inside the square
const JOBS = [
  ["logo-1024", 1024, null, 1], ["logo-512", 512, null, 1], ["github-logo-200", 200, null, 1], ["google-logo-120", 120, "#FFFFEB", 0.84],
  ["logo-512-cream", 512, "#FFFFEB", 0.8], ["apple-icon", 180, "#FFFFEB", 0.8],
];
for (const [name, size, bg, scale] of JOBS) {
  const html = `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg ?? "transparent"}"><div style="width:${Math.round(size * scale)}px;height:${Math.round(size * scale)}px">${svg}</div></body>`;
  await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: bg ? { r: 255, g: 255, b: 235, a: 1 } : { r: 0, g: 0, b: 0, a: 0 } });
  await send("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });
  await sleep(500);
  const r = await send("Page.captureScreenshot", { format: "png", omitBackground: !bg });
  writeFileSync(`public/brand/${name}.png`, Buffer.from(r.data, "base64"));
  console.log("wrote", name, size);
}
ws.close(); chrome.kill(); process.exit(0);

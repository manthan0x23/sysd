// usage: node scripts/prices/run.mjs [provider ...]   (default: all)
const ADAPTERS = {
  "akamai-linode": () => import("./linode.mjs"), vultr: () => import("./vultr.mjs"), "oracle-cloud": () => import("./oracle.mjs"), scaleway: () => import("./scaleway.mjs"),
  aws: () => import("./aws.mjs"), azure: () => import("./azure.mjs"),
};
const want = process.argv.slice(2);
for (const name of want.length ? want : Object.keys(ADAPTERS)) {
  if (!ADAPTERS[name]) { console.error(`unknown provider: ${name}`); process.exitCode = 1; continue; }
  try { console.log(name, "->", await (await ADAPTERS[name]()).run()); }
  catch (e) { console.error(name, "FAILED:", e.message); process.exitCode = 1; }
}

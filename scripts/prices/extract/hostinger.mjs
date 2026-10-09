import { raw, num, write } from "./lib.mjs";

const md = raw("hostinger", 1);
const seen = new Map();
// Card layout: "KVM n", list price, intro "$x/mo", "Renews at $y/mo", "**n** vCPU", "**n GB** RAM", "**n GB** NVMe", "**n TB** bandwidth"
for (const m of md.matchAll(/KVM (\d)\n+\$([\d.,]+)\n+\$([\d.,]+)\/mo[\s\S]{0,120}?Renews at \$([\d.,]+)\/mo[\s\S]{0,80}?\*\*(\d+)\*\* vCPU[\s\S]{0,40}?\*\*(\d+) GB\*\* RAM[\s\S]{0,40}?\*\*(\d+) GB\*\* NVMe[\s\S]{0,40}?\*\*(\d+) TB\*\* bandwidth/g)) {
  if (seen.has(m[1])) continue;
  seen.set(m[1], { offerings: ["vps:hostinger:kvm-vps"], tier: `KVM ${m[1]}`, spec: { vcpu: +m[5], ramGb: +m[6], diskGb: +m[7], transferGb: +m[8] * 1000, diskType: "NVMe" }, price: { amount: num(m[4]), unit: "month" }, introPrice: { amount: num(m[3]), unit: "month", note: "intro price for a 24-month term" }, listPrice: num(m[2]) });
}
write("hostinger", [...seen.values()], { notes: "Price is the renewal rate; introPrice applies to the first 24-month term. Struck-through list price is not a real price." });

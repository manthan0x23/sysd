import { raw, tables, num, write } from "./lib.mjs";

const llm = (offerings, tier, rates, spec = {}, note) => ({ offerings: [].concat(offerings), tier, spec, rates: rates.filter((r) => r[1] !== undefined).map(([name, amount, unit]) => ({ name, amount, unit })), ...(note ? { note } : {}) });
const IN = "1m-tokens-in", OUT = "1m-tokens-out", CACHE = "1m-tokens-cached";

// --- DeepSeek: peak = 2x off-peak. Recorded at the PEAK rate (worst case); off-peak noted.
write("deepseek", [
  llm("llm:deepseek:api", "deepseek-flash (V4.1 Flash)", [["input (cache miss), peak", 0.3, IN], ["output, peak", 1.2, OUT], ["cached input, peak", 0.006, CACHE], ["input (cache miss), off-peak", 0.15, IN], ["output, off-peak", 0.6, OUT], ["cached input, off-peak", 0.003, CACHE]], { contextTokens: 1000000 }),
  llm("llm:deepseek:api", "deepseek-v4-pro (0813)", [["input (cache miss), peak", 1.32, IN], ["output, peak", 3.96, OUT], ["cached input, peak", 0.044, CACHE], ["input (cache miss), off-peak", 0.66, IN], ["output, off-peak", 1.98, OUT], ["cached input, off-peak", 0.022, CACHE]], { contextTokens: 1000000 }),
], { notes: "Off-peak rates are half of peak. Peak hours 01:00-04:00 and 06:00-10:00 UTC, Mon-Fri excl. Chinese public holidays." });

// --- Together AI: serverless table, "Input" cell may carry a cached price in parentheses
const tg = [];
const first = tables(raw("together-ai", 1)).find((t) => t.rows.some((r) => /MiniMax/.test(Object.values(r)[0])));
for (const r of first.rows) {
  const v = Object.values(r);
  if (!/\$/.test(v[1])) continue;
  const name = v[0].replace(/\\ ?/g, "").replace(/PROMO.*$/i, "").trim();
  const nums = [...String(v[1]).matchAll(/\$([\d.]+)( \(cached\))?/g)];
  const inP = +nums[0][1];
  const cached = nums.find((m) => m[2]);
  const promo = /PROMO/i.test(v[0]);
  tg.push(llm("llm:together-ai:inference", name, [["input", inP, IN], ["output", num(v[2]), OUT], ["cached input", cached ? +cached[1] : undefined, CACHE]], {}, promo ? "Promotional pricing shown on the page until Oct 11, 2026; list price recorded." : undefined));
}
write("together-ai", tg, { notes: "Serverless on-demand per-1M-token table (first table). Batch table and dedicated GPU endpoint prices are separate." });

// --- xAI
write("xai", [llm("llm:xai:grok-api", "Grok 4.7", [["input", 2, IN], ["output", 6, OUT]], {}, "Also on the page: speech-to-speech $0.08/min, TTS $15/1M chars, STT $0.10/hr batch / $0.20/hr streaming, images from $0.02, video from $0.02/sec.")], { notes: "Only the headline model block was captured; other Grok models were not in the scrape." });

// --- Fireworks AI: embeddings per 1M input tokens, fine-tune training per 1M tokens
write("fireworks-ai", [
  llm("llm:fireworks-ai:inference", "Embeddings up to 150M params", [["input", 0.008, IN]]),
  llm("llm:fireworks-ai:inference", "Embeddings 150M-350M params", [["input", 0.016, IN]]),
  llm("llm:fireworks-ai:inference", "Qwen3 8B embeddings", [["input", 0.1, IN]]),
  llm("llm:fireworks-ai:inference", "Fine-tuning: LoRA SFT up to 16B", [["training", 0.5, "1m-tokens"]]),
  llm("llm:fireworks-ai:inference", "Fine-tuning: LoRA SFT 16.1B-80B", [["training", 3, "1m-tokens"]]),
  llm("llm:fireworks-ai:inference", "Fine-tuning: LoRA SFT 80B-300B", [["training", 6, "1m-tokens"]]),
  llm("llm:fireworks-ai:inference", "Fine-tuning: LoRA SFT >300B", [["training", 10, "1m-tokens"]]),
], { notes: "Per-model serverless inference prices are on a separate full pricing page (not scraped); on-demand GPU prices per GPU-second also elsewhere." });

// --- Voyage AI: embeddings and rerank
const vo = [];
const vt = tables(raw("voyage-ai", 1));
for (const t of vt) {
  for (const r of t.rows) {
    const v = Object.values(r);
    const name = String(v[0]).replace(/`/g, "").replace(/<br>/g, " / ");
    if (t.headers.includes("Price per million tokens") && !t.headers.includes("Price per billion pixels") && !t.headers.includes("Estimated price per request*")) vo.push(llm("embeddings:voyage-ai:embeddings", name, [["input", num(r["Price per million tokens"]), IN]], { freeTokens: r["Number of free tokens"] }));
    else if (t.headers.includes("Price per billion pixels")) vo.push(llm("embeddings:voyage-ai:embeddings", `${name} (multimodal)`, [["input", num(r["Price per million tokens"]), IN], ["pixels", num(r["Price per billion pixels"]), "other"]], {}, "Pixels priced per billion."));
  }
}
write("voyage-ai", vo);

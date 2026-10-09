import { raw, tables, num, write } from "./lib.mjs";

const tok = (inP, outP, cachedP, extra = []) => [["input", inP, "1m-tokens-in"], ["output", outP, "1m-tokens-out"], ...(cachedP !== undefined ? [["cached input", cachedP, "1m-tokens-cached"]] : []), ...extra].filter((r) => r[1] !== undefined);
const llm = (offerings, tier, rates, spec = {}, note) => ({ offerings: [].concat(offerings), tier, spec, rates: rates.map(([name, amount, unit]) => ({ name, amount, unit })), ...(note ? { note } : {}) });

// --- Anthropic: Model pricing table (per million tokens)
const at = tables(raw("anthropic", 1))[0];
const an = [];
for (const r of at.rows) {
  const v = Object.values(r);
  if (!/Claude/.test(v[0]) || v.length < 6) continue;
  const name = v[0].replace(/^!<br>/, "").replace(/\s+(For|The|Our|A)\s.*$/, "").trim();
  const [inP, outP, w5, w1, hit] = [v[1], v[2], v[3], v[4], v[5]].map((x) => num(x));
  const tiered = /over 100,000/.test(v[1]);
  an.push(llm("llm:anthropic:claude-api", name, tok(tiered ? 0.1 : inP, outP, hit, [["cache write 5m", w5, "1m-tokens-in"], ["cache write 1h", w1, "1m-tokens-in"], ...(tiered ? [["input over 100k-token prompts", 0.5, "1m-tokens-in"]] : [])]), {}, tiered ? "Input is $0.10/MTok for prompts up to 100,000 tokens and $0.50/MTok above." : undefined));
}
write("anthropic", an, { notes: "Per million tokens (MTok). Cached-input = 'Hits and refreshes'. Same rates apply to Claude on AWS/Foundry via CCU billing ($0.01 per CCU)." });

// --- OpenAI: tables 0-4 are the processing modes shown as tabs on the page (Standard, Batch, Flex, Fast, Ultrafast), same model rows
const T = tables(raw("openai", 1));
const modes = ["Standard", "Batch", "Flex", "Fast", "Ultrafast"];
const oa = [];
const price = (s) => num(s);
T.slice(0, 5).forEach((t, i) => {
  for (const r of t.rows) {
    const v = Object.values(r);
    if (!/^gpt-/i.test(v[0]) || v.length < 9) continue;
    oa.push(llm("llm:openai:api", `${v[0]} (${modes[i]})`, tok(price(v[1]), price(v[4]), price(v[2]), [["cache write", price(v[3]), "1m-tokens-in"], ["input, long context", price(v[5]), "1m-tokens-in"], ["output, long context", price(v[8]), "1m-tokens-out"], ["cached input, long context", price(v[6]), "1m-tokens-cached"]]), { mode: modes[i], model: v[0] }));
  }
});
for (const r of T[5].rows) {
  const v = Object.values(r);
  if (!/^gpt-/i.test(v[0]) || v.length < 9) continue;
  oa.push(llm("llm:openai:api", `${v[0]} (Standard)`, tok(price(v[1]), price(v[4]), price(v[2]), [["cache write", price(v[3]), "1m-tokens-in"], ["input, long context", price(v[5]), "1m-tokens-in"], ["output, long context", price(v[8]), "1m-tokens-out"]]), { mode: "Standard", model: v[0], group: "Cyber models" }));
}
write("openai", oa, { notes: "Per million tokens. Tab-to-table mapping (Standard, Batch, Flex, Fast, Ultrafast) assumed from the page's tab order; Batch/Flex rows are 50% of Standard, consistent with that. Embeddings, Whisper/TTS, image prices are in other tables not exported here." });

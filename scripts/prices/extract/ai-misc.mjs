import { write, plan } from "./lib.mjs";
const llm = (offerings, tier, rates, note) => ({ offerings: [].concat(offerings), tier, spec: {}, rates: rates.map(([name, amount, unit]) => ({ name, amount, unit })), ...(note ? { note } : {}) });
const IN = "1m-tokens-in", OUT = "1m-tokens-out";

write("cohere", [
  llm("llm:cohere:api", "Command", [["input", 1, IN], ["output", 2, OUT]]),
  llm("llm:cohere:api", "Command-light", [["input", 0.3, IN], ["output", 0.6, OUT]]),
  llm("llm:cohere:api", "Command R (03-2024)", [["input", 0.5, IN], ["output", 1.5, OUT]]),
  llm("llm:cohere:api", "Command R+ (04-2024)", [["input", 3, IN], ["output", 15, OUT]]),
  llm("llm:cohere:api", "Command R+ (08-2024)", [["input", 2.5, IN], ["output", 10, OUT]]),
  llm("llm:cohere:api", "Aya Expanse (8B and 32B)", [["input", 0.5, IN], ["output", 1.5, OUT]]),
], { notes: "These are the models listed on the scraped pricing page (older generation). Private-deployment instance prices ($3-$10/hour, $2,000-$6,500/month per instance) appear without model names. Embed/Rerank prices not on this page." });
write("assemblyai", [
  plan("speech:assemblyai:speech", "Universal-3.5 Pro (pre-recorded)", null, "hour", { rates: [["transcription", 0.21, "hour"]] }),
  plan("speech:assemblyai:speech", "Universal-2 (pre-recorded)", null, "hour", { rates: [["transcription", 0.15, "hour"]] }),
  plan("speech:assemblyai:speech", "Universal-3.6 Pro Realtime", null, "hour", { rates: [["streaming transcription", 0.45, "hour"]] }),
  plan("speech:assemblyai:speech", "Universal-Streaming", null, "hour", { rates: [["streaming transcription", 0.15, "hour"]], note: "Multilingual variant $0.15/hr." }),
], { notes: "Add-ons per hour: diarization $0.02 (pre-recorded) / $0.12 (realtime), keyterms $0.05, medical mode $0.15, PII redaction $0.12 (realtime)." });
write("mistral", [], { notes: "The scraped URL returned Le Chat consumer plans (Pro $14.99, Team $24.99/user), not API token prices. API per-model prices NOT captured." });

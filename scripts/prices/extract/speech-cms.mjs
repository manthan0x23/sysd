import { write, plan } from "./lib.mjs";

write("deepgram", [
  plan("speech:deepgram:speech", "Nova-3 Monolingual (pay as you go)", null, "minute", { rates: [["current price", 0.0048, "minute"], ["regular price", 0.0077, "minute"]], note: "Streaming same price. Growth plan $0.0042/min (regular $0.0065)." }),
  plan("speech:deepgram:speech", "Nova-3 Multilingual (pay as you go)", null, "minute", { rates: [["current price", 0.0058, "minute"], ["regular price", 0.0092, "minute"]] }),
  plan("speech:deepgram:speech", "Flux English (pay as you go)", null, "minute", { rates: [["current price", 0.0065, "minute"], ["regular price", 0.0077, "minute"]] }),
  plan("speech:deepgram:speech", "Flux Multilingual (pay as you go)", null, "minute", { rates: [["price", 0.0078, "minute"]] }),
  plan("speech:deepgram:speech", "Text-to-speech Aura-2", null, "month", { rates: [["per 1K characters (pay as you go)", 0.03, "other"]], note: "Aura-1 $0.015, Flux TTS $0.045 per 1K characters; Growth plan ~10% lower." }),
], { notes: "'Current price' is a promotional price; the struck-through 'regular price' is also recorded." });
write("elevenlabs", [
  plan("speech:elevenlabs:voice", "Eleven v4 TTS", null, "month", { rates: [["regular, per 1K characters", 0.08, "other"], ["promo until Oct 12, per 1K characters", 0.022, "other"]] }),
  plan("speech:elevenlabs:voice", "Eleven v4 Turbo TTS", null, "month", { rates: [["regular, per 1K characters", 0.04, "other"], ["promo until Oct 12, per 1K characters", 0.011, "other"]] }),
  plan("speech:elevenlabs:voice", "Eleven v3 TTS", null, "month", { rates: [["per 1K characters", 0.08, "other"]] }),
], { notes: "API pricing page. Speech-to-text ($0.22, unit not shown) not recorded." });
write("contentful", [plan("cms:contentful:platform", "Free", 0, "month"), plan("cms:contentful:platform", "Lite", 300, "month")]);
write("strapi", [plan("cms:strapi:cloud", "Starter", 35, "month"), plan("cms:strapi:cloud", "Pro", 90, "month"), plan("cms:strapi:cloud", "Business", 450, "month")]);
write("storyblok", [], { notes: "No plan prices in the scrape." });
write("jina", [], { notes: "Page too large/noisy; no embedding token prices identified in scrape ($50 technical support line only)." });

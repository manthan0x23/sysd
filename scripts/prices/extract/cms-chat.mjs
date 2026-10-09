import { write, plan } from "./lib.mjs";

write("stream", [plan("chat:stream:chat", "Start", 399, "month", { note: "Billed annually; $499 billed monthly." }), plan("chat:stream:chat", "Elevate", 599, "month", { note: "Billed annually; $675 billed monthly." })], { notes: "Free Maker plan and Enterprise exist; limits (MAU, concurrent connections) not captured." });
write("sendbird", [plan("chat:sendbird:chat", "Starter (lower paid tier)", 349, "month", { note: "Billed annually; $399/month billed monthly. Plan name not captured." }), plan("chat:sendbird:chat", "Growth (higher paid tier)", 499, "month", { note: "Billed annually; $599/month billed monthly. Plan name not captured." })], { notes: "Tier names are descriptions from the page copy ('Get started with chat', 'Grow your business'), not official plan names." });
write("sanity", [plan("cms:sanity:content-lake", "Free", 0, "month"), plan("cms:sanity:content-lake", "Growth", 15, "seat-month", { note: "Add-ons: +$799/month dedicated support, $999 per extra dataset." })]);
write("hygraph", [plan("cms:hygraph:cms", "Free", 0, "month"), plan("cms:hygraph:cms", "Growth", 199, "month", { note: "'From $199'." })]);
write("imagekit", [plan("images:imagekit:media", "Forever free", 0, "month"), plan("images:imagekit:media", "Lite", 9, "month"), plan("images:imagekit:media", "Pro", 89, "month")]);
write("payload", [], { notes: "Scrape returned no prices." });
write("agora", [], { notes: "Scrape returned no content." });
write("zoom", [], { notes: "Scrape returned no content." });

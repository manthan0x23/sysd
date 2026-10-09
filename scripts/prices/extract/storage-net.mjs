import { write, plan } from "./lib.mjs";

write("backblaze", [
  plan("object:backblaze:b2", "B2 Cloud Storage", 6.95, "tb-month", { rates: [["egress beyond free (3x stored/month)", 0.01, "gb"]], note: "Egress free up to 3x monthly average storage; overage rate per existing catalog data ($0.01/GB) not re-confirmed on this scrape." }),
  plan("archive:backblaze:b2-cold-use", "B2 Cloud Storage (same price)", 6.95, "tb-month"),
], { notes: "Page shows 'Starts at $6.95/TB/mo' and a second 'Starts at $15/TB/mo' figure whose product was not identifiable in the scrape (not recorded)." });

write("wasabi", [plan("object:wasabi:hot-cloud-storage", "Hot Cloud Storage", 7.99, "tb-month", { note: "Starting at $7.99 per TB per month; page also shows $8.18 (unlabelled, maybe regional/incl. fees). No egress or API fees. 1 TB minimum." })]);

write("tigris", [
  plan("object:tigris:object-storage", "Standard", null, "gb-month", { rates: [["storage", 0.02, "gb-month"], ["class A requests", 0.005, "1k-requests"], ["class B requests", 0.0005, "1k-requests"]] }),
  plan("object:tigris:object-storage", "Infrequent Access", null, "gb-month", { rates: [["storage", 0.01, "gb-month"], ["class A requests", 0.005, "1k-requests"]] }),
], { notes: "Two colder classes at $0.004/GB-month also appear in the price table; their names were not captured. Egress not charged per the page's comparison (not confirmed here)." });

write("keycdn", [
  plan("cdn:keycdn:cdn", "North America & Europe (first tier)", null, "gb", { rates: [["first tier", 0.04, "gb"]], note: "Volume tiers: $0.04 / $0.03 / $0.02 / $0.01 per GB (break points not captured)." }),
  plan("cdn:keycdn:cdn", "Asia & Oceania (first tier)", null, "gb", { rates: [["first tier", 0.08, "gb"]], note: "Volume tiers: $0.08 / $0.06 / $0.04 / $0.02 per GB." }),
  plan("cdn:keycdn:cdn", "Africa & Latin America (first tier)", null, "gb", { rates: [["first tier", 0.1, "gb"]], note: "Volume tiers: $0.10 / $0.08 / $0.06 / $0.04 per GB." }),
], { notes: "Minimum usage $4/month; first 3 zones free, extra zones $1/month." });

write("cdn77", [
  plan("cdn:cdn77:cdn", "Growth plan", 990, "month", { rates: [["overage", 3.96, "tb"]] }),
  plan("cdn:cdn77:cdn", "Object Storage egress (pay as you go)", null, "gb", { rates: [["egress", 0.09, "gb"]], note: "Also shown: $100/month for a $0.02/GB committed tier." }),
]);

write("ns1", [plan("dns:ns1:managed-dns", "Essentials", 99, "month", { note: "'Starting at $99.00 USD'; $69.30 also displayed (likely annual-billing discount)." })]);

write("kong", [
  plan("apigw:kong:konnect", "Konnect Plus", 25, "month", { note: "'From $25/month plus usage'. Usage: $20 per 1M events up to 10M; dedicated cloud gateway control plane $500/month each + $0.15/GB bandwidth." }),
]);

write("pusher", [["Startup", 49], ["Pro", 99], ["Business", 299], ["Premium", 499]].map(([n, p]) => plan("pubsub:pusher:channels", n, p, "month")), { notes: "Higher plans (Growth $699, Plus $899, Growth Plus $1,199) also appear but their product line (Channels vs Beams) was not identifiable. Connection/message limits not captured." });

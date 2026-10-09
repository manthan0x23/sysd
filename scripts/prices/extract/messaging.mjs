import { write, plan } from "./lib.mjs";

write("pubnub", [
  plan("pubsub:pubnub:realtime", "Platform Pro (1,000 MAU, example)", 190, "month", { note: "Estimated. Pricing is MAU-based: up to 10K MAU = ($130 base + $0.04/MAU, capped at $500) x 1.1; 10K-50K MAU = ($500 base + $0.035 per additional MAU) x 1.1." }),
  plan("pubsub:pubnub:realtime", "Platform Pro (10,000 MAU, example)", 550, "month"),
  plan("pubsub:pubnub:realtime", "Platform Pro (50,000 MAU, example)", 2100, "month"),
  plan("chat:pubnub:chat", "Platform Pro (same MAU pricing)", 190, "month", { note: "Chat uses the same MAU-based platform pricing; 1,000 MAU example." }),
]);
write("nats", [plan("pubsub:nats:synadia-cloud", "Personal", 0, "month"), plan("pubsub:nats:synadia-cloud", "Starter", 49, "month"), plan("pubsub:nats:synadia-cloud", "Pro", 199, "month", { note: "For pre-prod / non-critical." })], { notes: "'Bring Your Own NATS' also $49/month." });
write("confluent", [
  plan("stream:confluent:cloud", "Basic cluster", 0, "month", { note: "'Starting at $0/Month'; throughput-based usage billing applies." }),
  plan("stream:confluent:cloud", "Standard cluster", 385, "month", { note: "'~$385/Month' starting estimate." }),
  plan("stream:confluent:cloud", "Enterprise cluster", 895, "month", { note: "'~$895/Month' starting estimate." }),
], { notes: "Cluster base estimates only; ingress/egress/storage/partition rates and Flink/connector prices are in tables not captured as labelled data." });
write("temporal", [
  plan("workflow:temporal:cloud", "Usage-based", null, "month", { rates: [["actions, starting at", 50, "1m-requests"], ["active storage", 0.042, "gb-hour"], ["retained storage", 0.00105, "gb-hour"]], note: "$150 free credits for 90 days." }),
  plan("workflow:temporal:cloud", "Volume (self-service, down to)", null, "month", { rates: [["actions", 25, "1m-requests"]] }),
  plan("workflow:temporal:cloud", "Committed tier", 500, "month", { note: "'Greater of $500/mo or 10% of usage'." }),
], { notes: "Named plans (Essentials/Business/etc.) are not identifiable in the scrape, so only the rates above are recorded." });
write("inngest", [
  plan(["workflow:inngest:cloud", "worker:inngest:functions"], "Free", 0, "month"),
  plan(["workflow:inngest:cloud", "worker:inngest:functions"], "Pro", 99, "month", { note: "'Starting at'." }),
  plan(["workflow:inngest:cloud", "worker:inngest:functions"], "Business", 499, "month", { note: "'Starting at'." }),
]);
write("astronomer", [
  plan("workflow:astronomer:astro", "Developer", null, "hour", { rates: [["deployment, starting at", 0.35, "hour"]] }),
  plan("workflow:astronomer:astro", "Team", null, "hour", { rates: [["deployment, starting at", 0.42, "hour"]] }),
], { notes: "Deployments run continuously, fixed hourly price per size; larger sizes not captured." });
write("prefect", [
  plan("workflow:prefect:cloud", "Hobby", 0, "month"),
  plan("workflow:prefect:cloud", "Starter", 100, "month"),
  plan("workflow:prefect:cloud", "Team", 100, "user-month"),
]);

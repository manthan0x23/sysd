import { write, plan } from "./lib.mjs";

write("cloudamqp", [
  plan("queue:cloudamqp:rabbitmq", "Shared (free)", 0, "month"),
  plan("queue:cloudamqp:rabbitmq", "Shared (paid)", 19, "month"),
  ...[[4, 49], [10, 99], [20, 199], [50, 499], [100, 999], [200, 1999], [300, 2999]].map(([gb, p]) => plan("queue:cloudamqp:rabbitmq", `Dedicated, ${gb} GB disk (first listed group)`, p, "month", { spec: { diskGb: gb }, note: "Dedicated plans are listed in more than one group (LavinMQ / RabbitMQ at different prices, e.g. a second 4 GB plan at $147); this first group's product is not labelled in the scrape." })),
], { notes: "Plan names (animal names) and per-plan message quotas not captured. VPC add-on $99/month, extra disk $0.35/GB." });
write("memcachier", [plan("memcached:memcachier:cloud", "Free", 0, "month"), plan("memcached:memcachier:cloud", "Basic", 14, "month", { note: "'~$14/month'." }), plan("memcached:memcachier:cloud", "Advanced", 58, "month", { note: "'~$58/month'." }), plan("memcached:memcachier:cloud", "Business", 440, "month", { note: "'~$440/month'." })]);
write("coolify", [plan("paas:coolify:self-hosted-paas", "Coolify Cloud", 5, "month", { note: "$5/month base (connect 2 servers) + $3/month per additional server. Self-hosted Coolify is free; you pay for your own servers." })]);
write("nhost", [plan("baas:nhost:platform", "Starter", 0, "month", { note: "1 project; paused after 1 week of inactivity." }), plan("baas:nhost:platform", "Pro", 25, "month", { note: "Database 10 GB included then $0.20/GB; storage 50 GB then $0.05/GB." }), plan("baas:nhost:platform", "Team", 599, "month", { note: "Plan name for the $599 column not confirmed in the scrape." })], { notes: "Plan names inferred from column order (Starter/Pro/Team); verify." });
write("zuplo", [], { notes: "Only a custom-domain add-on ($25/month for 2 domains) captured; plan prices not parsed." });
write("tyk", [], { notes: "Scrape had no plan prices." });

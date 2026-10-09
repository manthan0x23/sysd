import { write, plan } from "./lib.mjs";

write("railway", [
  plan(["paas:railway:platform", "app:railway:services", "containers:railway:services"], "Free trial", 0, "month", { spec: { maxVcpu: 1, maxRamGb: 0.5, volumeGb: 0.5 }, note: "30-day trial with $5 credits, then $1/month; limits shown are after the trial." }),
  plan(["paas:railway:platform", "app:railway:services", "containers:railway:services"], "Hobby", 5, "month", { spec: { maxVcpu: 48, maxRamGb: 48, maxReplicas: 5, includedUsageUsd: 5 } }),
  plan(["paas:railway:platform", "app:railway:services", "containers:railway:services"], "Pro", 20, "month", { spec: { maxVcpu: 1000, maxRamGb: 1000, maxReplicas: 42, includedUsageUsd: 20 } }),
  plan(["paas:railway:platform", "app:railway:services", "containers:railway:services"], "Usage rates", null, "month", { rates: [["memory", 0.00000386, "gb-second"], ["CPU", 0.00000772, "second"], ["volume", 0.00000006, "gb-second"], ["egress", 0.05, "gb"], ["object storage", 0.015, "gb-month"]], note: "CPU rate is per vCPU-second; volumes per GB-second. Billed by the second." }),
], { notes: "Higher plans (Enterprise) are contact-sales. Plan-name assignment of the two included-credit blocks inferred from card order (Hobby then Pro)." });

write("koyeb", [
  plan(["containers:koyeb:services"], "Pro", 29, "month", { spec: { includedComputeUsd: 10 }, note: "Plus compute." }),
  plan(["containers:koyeb:services"], "Scale", 299, "month", { spec: { includedComputeUsd: 100 }, note: "Plus compute." }),
  plan(["containers:koyeb:services"], "Small instance", 29.2, "month", { hourly: 0.04, note: "Page shows $0.04/hr for 'Small'; monthly = hourly x 730. CPU/RAM split not captured." }),
], { notes: "GPU rates ($0.50-$5.50/hr) are listed but GPU model names were not in the scrape. Storage $0.50/GB-month." });

write("github", [
  plan(["ci:github:actions", "static:github:pages"], "Free", 0, "user-month"),
  plan(["ci:github:actions", "static:github:pages"], "Team", 4, "user-month"),
  plan(["ci:github:actions", "static:github:pages"], "Enterprise", 21, "user-month"),
  plan("ci:github:actions", "Actions minutes (pay as you go)", null, "minute", { rates: [["Linux 1-core", 0.002, "minute"], ["Linux 2-core x64", 0.006, "minute"], ["Linux 2-core arm64", 0.005, "minute"], ["Windows 2-core", 0.01, "minute"], ["macOS 3/4-core", 0.062, "minute"]] }),
  plan("ci:github:actions", "Actions storage", null, "gb-month", { rates: [["shared storage (artifacts/Packages)", 0.25, "gb-month"], ["Actions cache", 0.07, "gb-month"]] }),
  plan("registry:github:container-registry", "Packages storage", null, "gb-month", { rates: [["shared storage", 0.25, "gb-month"]] }),
], { notes: "Included minutes per plan not captured. Git LFS: $5/month for 50 GB bandwidth + 50 GB storage." });

write("fastly", [
  plan("fn:fastly:compute", "Compute requests", null, "1m-requests", { rates: [["100k-1M tier", 2.5, "1m-requests"], ["1M-5M", 2.25, "1m-requests"], ["5M-25M", 2.1, "1m-requests"], ["25M-100M", 2, "1m-requests"], ["beyond 100M", 1.75, "1m-requests"]], note: "Per-million-request tiers as listed (unit assumed per 1M)." }),
  plan("cdn:fastly:cdn", "Platform packages", 1500, "month", { note: "Page lists packages at $1,500 and $6,000 per month, others contact sales; package names not captured." }),
], { notes: "Next-Gen WAF and CDN bandwidth rates were not in the scrape." });

write("paperspace", [
  plan("gpu:paperspace:core", "Pro plan", 8, "month", { note: "Names Free $0 / Pro $8 / Growth $39 per month shown; second set shows Pro $12 (different plan group, e.g. billing period)." }),
  plan("gpu:paperspace:core", "Growth plan", 39, "month"),
  plan("gpu:paperspace:core", "Free plan", 0, "month"),
], { notes: "Machine (GPU-hour) rates not captured; Paperspace is now part of DigitalOcean." });
write("vast-ai", [], { notes: "Page shows 'from $x/hr, median $y/hr' per GPU but the GPU names were not in the scrape, so rates cannot be attributed. Marketplace prices also vary live." });
write("firebase", [], { notes: "Only a Firestore-style per-request line was captured; Spark/Blaze plan pricing not parsed." });

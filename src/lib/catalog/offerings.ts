import { TYPE_BY_ID } from "./services";
import type { Model, Offering } from "./types";

type Row = [provider: string, product: string, model?: Model];
const M: Model = "managed";
const S: Model = "serverless";
const SH: Model = "self-hosted";
const SAAS: Model = "saas";

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Which providers sell each service type. Names only: prices and plan specs are loaded from sources
 * in Phase 2 (each with a source URL and fetch date). First row is the default for a new node.
 * Self-hosted rows are added automatically for every type that has a sizing profile.
 */
const RAW: Record<string, Row[]> = {
  vps: [
    ["Hostinger", "KVM VPS"], ["DigitalOcean", "Droplets"], ["Akamai (Linode)", "Shared CPU"], ["Hetzner", "Cloud servers"],
    ["Vultr", "Cloud Compute"], ["OVHcloud", "VPS"], ["Contabo", "Cloud VPS"], ["Scaleway", "Instances"],
    ["AWS", "EC2"], ["AWS", "Lightsail"], ["Google Cloud", "Compute Engine"], ["Microsoft Azure", "Virtual Machines"],
    ["Oracle Cloud", "Compute"], ["Bluehost", "VPS"], ["GoDaddy", "VPS"], ["Namecheap", "VPS"], ["IONOS", "VPS"], ["HostGator", "VPS"],
    ["A2 Hosting", "VPS"], ["InMotion Hosting", "VPS"], ["Liquid Web", "VPS"], ["Kamatera", "Cloud servers"], ["Cloudways", "Managed cloud servers"],
    ["UpCloud", "Cloud servers"], ["E2E Networks", "Cloud compute"], ["Alibaba Cloud", "ECS"], ["Tencent Cloud", "CVM"], ["Your own hardware", "On-prem / colo"],
  ],
  container: [["Docker", "Container on your server", SH]],
  fn: [
    ["AWS", "Lambda", S], ["Google Cloud", "Cloud Run functions", S], ["Microsoft Azure", "Functions", S],
    ["Cloudflare", "Workers", S], ["Vercel", "Functions", S], ["Netlify", "Functions", S], ["Supabase", "Edge Functions", S],
    ["Deno", "Deploy", S], ["Fastly", "Compute", S], ["Alibaba Cloud", "Function Compute", S],
  ],
  app: [
    ["AWS", "Elastic Beanstalk", M], ["AWS", "App Runner", M], ["Google Cloud", "App Engine", M],
    ["Microsoft Azure", "App Service", M], ["Heroku", "Dynos", M], ["Render", "Web services", M], ["Railway", "Services", M],
    ["Fly.io", "Machines", M], ["DigitalOcean", "App Platform", M],
    ["Self-hosted", "Node.js", SH], ["Self-hosted", "Go", SH], ["Self-hosted", "Rust", SH], ["Self-hosted", "Python", SH], ["Self-hosted", "Java", SH],
    ["Self-hosted", ".NET", SH], ["Self-hosted", "PHP", SH], ["Self-hosted", "Ruby on Rails", SH], ["Self-hosted", "Bun", SH], ["Self-hosted", "Deno", SH],
  ],
  containers: [
    ["AWS", "ECS on Fargate", S], ["AWS", "ECS on EC2", M], ["Google Cloud", "Cloud Run", S], ["Microsoft Azure", "Container Apps", S],
    ["Microsoft Azure", "Container Instances", S], ["Fly.io", "Machines", M], ["Railway", "Services", M],
    ["DigitalOcean", "App Platform", M], ["Koyeb", "Services", M],
  ],
  worker: [
    ["AWS", "Batch", M], ["Google Cloud", "Cloud Run jobs", S], ["Modal", "Functions", S], ["Inngest", "Functions", SAAS],
    ["Trigger.dev", "Tasks", SAAS], ["Temporal", "Workers", SAAS], ["Render", "Background workers", M],
    ["Self-hosted", "Node.js", SH], ["Self-hosted", "Go", SH], ["Self-hosted", "Rust", SH], ["Self-hosted", "Python", SH], ["Self-hosted", "Java", SH],
    ["Self-hosted", ".NET", SH], ["Self-hosted", "PHP", SH], ["Self-hosted", "Ruby on Rails", SH], ["Self-hosted", "Bun", SH], ["Self-hosted", "Deno", SH],
  ],
  k8s: [
    ["AWS", "EKS", M], ["Google Cloud", "GKE", M], ["Microsoft Azure", "AKS", M], ["DigitalOcean", "DOKS", M],
    ["Akamai (Linode)", "LKE", M], ["OVHcloud", "Managed Kubernetes", M], ["Vultr", "VKE", M], ["Hetzner", "Kubernetes (self-managed)", SH],
  ],
  paas: [
    ["Heroku", "Platform", M], ["Render", "Platform", M], ["Railway", "Platform", M], ["Fly.io", "Platform", M],
    ["Vercel", "Platform", M], ["Netlify", "Platform", M], ["Northflank", "Platform", M], ["Coolify", "Self-hosted PaaS", SH],
  ],
  static: [
    ["Vercel", "Hosting"], ["Netlify", "Hosting"], ["Cloudflare", "Pages"], ["AWS", "Amplify Hosting"], ["Firebase", "Hosting"],
    ["GitHub", "Pages"], ["Azure", "Static Web Apps"], ["Google Cloud", "Storage + CDN"],
  ],
  baas: [
    ["Supabase", "Platform", M], ["Firebase", "Platform", M], ["Appwrite", "Cloud", M], ["Convex", "Platform", M],
    ["AWS", "Amplify", M], ["PocketBase", "Self-hosted", SH], ["Nhost", "Platform", M],
  ],
  gpu: [
    ["AWS", "EC2 GPU instances"], ["Google Cloud", "GPU VMs"], ["Microsoft Azure", "ND / NC series"], ["Lambda", "GPU Cloud"],
    ["RunPod", "GPU Pods"], ["CoreWeave", "GPU Cloud"], ["Vast.ai", "Marketplace"], ["Modal", "GPU functions", S], ["Paperspace", "Core"],
  ],
  postgres: [
    ["AWS", "RDS for PostgreSQL"], ["AWS", "Aurora PostgreSQL"], ["Google Cloud", "Cloud SQL for PostgreSQL"], ["Google Cloud", "AlloyDB"],
    ["Microsoft Azure", "Database for PostgreSQL"], ["Neon", "Serverless Postgres", S], ["Supabase", "Database", M], ["PlanetScale", "Postgres", M],
    ["Crunchy Data", "Crunchy Bridge", M], ["Aiven", "PostgreSQL", M], ["Heroku", "Postgres", M], ["DigitalOcean", "Managed PostgreSQL", M],
    ["Render", "Postgres", M], ["Railway", "Postgres", M], ["Xata", "Postgres", S], ["Tembo", "Cloud", M], ["Prisma", "Postgres", S],
  ],
  mysql: [
    ["AWS", "RDS for MySQL"], ["AWS", "Aurora MySQL"], ["Google Cloud", "Cloud SQL for MySQL"], ["Microsoft Azure", "Database for MySQL"],
    ["PlanetScale", "Vitess MySQL", M], ["DigitalOcean", "Managed MySQL", M], ["Aiven", "MySQL", M], ["TiDB", "Cloud", S], ["AWS", "RDS for MariaDB"],
  ],
  mongodb: [
    ["MongoDB", "Atlas", M], ["AWS", "DocumentDB", M], ["Microsoft Azure", "Cosmos DB for MongoDB", M], ["DigitalOcean", "Managed MongoDB", M],
    ["Google Cloud", "Firestore", S], ["Couchbase", "Capella", M], ["FerretDB", "Cloud", M],
  ],
  sqlserver: [["Microsoft Azure", "SQL Database", M], ["AWS", "RDS for SQL Server", M], ["Google Cloud", "Cloud SQL for SQL Server", M]],
  kv: [
    ["AWS", "DynamoDB", S], ["Microsoft Azure", "Cosmos DB", S], ["Google Cloud", "Firestore", S], ["Google Cloud", "Bigtable", M],
    ["DataStax", "Astra DB", S], ["AWS", "Keyspaces", S], ["ScyllaDB", "Cloud", M], ["Cloudflare", "KV", S], ["Upstash", "Redis KV", S],
  ],
  newsql: [
    ["CockroachDB", "Cloud", M], ["Google Cloud", "Spanner", M], ["TiDB", "Cloud", S], ["YugabyteDB", "Aeon", M],
    ["AWS", "Aurora DSQL", S], ["SingleStore", "Helios", M], ["Neon", "Serverless Postgres", S],
  ],
  sqlite: [["Turso", "libSQL", S], ["Cloudflare", "D1", S], ["Fly.io", "LiteFS", SH], ["Bunny", "Database", S], ["Litestream", "Self-hosted", SH]],
  graph: [["Neo4j", "AuraDB", M], ["AWS", "Neptune", M], ["Microsoft Azure", "Cosmos DB Gremlin", S], ["ArangoDB", "Oasis", M], ["TigerGraph", "Savanna", M], ["Memgraph", "Cloud", M]],
  timeseries: [
    ["Timescale", "Cloud", M], ["InfluxData", "InfluxDB Cloud", M], ["AWS", "Timestream", S], ["Grafana", "Mimir (Cloud)", M],
    ["QuestDB", "Cloud", M], ["Azure", "Data Explorer", M], ["Google Cloud", "Bigtable", M],
  ],
  redis: [
    ["AWS", "ElastiCache for Redis"], ["AWS", "MemoryDB"], ["Google Cloud", "Memorystore"], ["Microsoft Azure", "Cache for Redis"],
    ["Redis", "Cloud", M], ["Upstash", "Redis", S], ["Aiven", "Valkey", M], ["DigitalOcean", "Managed Valkey", M], ["Render", "Key Value", M],
  ],
  memcached: [["AWS", "ElastiCache for Memcached", M], ["Google Cloud", "Memorystore for Memcached", M], ["Memcachier", "Cloud", M]],
  object: [
    ["AWS", "S3"], ["Google Cloud", "Cloud Storage"], ["Microsoft Azure", "Blob Storage"], ["Cloudflare", "R2"], ["Backblaze", "B2"],
    ["Wasabi", "Hot Cloud Storage"], ["DigitalOcean", "Spaces"], ["Tigris", "Object Storage"], ["Hetzner", "Object Storage"],
    ["Scaleway", "Object Storage"], ["Vultr", "Object Storage"], ["Akamai (Linode)", "Object Storage"],
  ],
  block: [["AWS", "EBS"], ["Google Cloud", "Persistent Disk"], ["Microsoft Azure", "Managed Disks"], ["DigitalOcean", "Volumes"], ["Hetzner", "Volumes"], ["Vultr", "Block Storage"]],
  file: [["AWS", "EFS"], ["AWS", "FSx"], ["Google Cloud", "Filestore"], ["Microsoft Azure", "Files"], ["DigitalOcean", "NFS"]],
  archive: [["AWS", "S3 Glacier"], ["Google Cloud", "Archive Storage"], ["Microsoft Azure", "Archive Blob"], ["Backblaze", "B2 (cold use)"]],
  lb: [
    ["AWS", "Application Load Balancer"], ["AWS", "Network Load Balancer"], ["Google Cloud", "Cloud Load Balancing"], ["Microsoft Azure", "Load Balancer / App Gateway"],
    ["Cloudflare", "Load Balancing"], ["DigitalOcean", "Load Balancers"], ["Hetzner", "Load Balancers"], ["Fly.io", "Anycast proxy"],
  ],
  cdn: [
    ["Cloudflare", "CDN"], ["AWS", "CloudFront"], ["Google Cloud", "Cloud CDN"], ["Microsoft Azure", "Front Door"], ["Fastly", "CDN"],
    ["Akamai", "Ion / CDN"], ["Bunny", "CDN"], ["Vercel", "Edge Network"], ["KeyCDN", "CDN"], ["CDN77", "CDN"],
  ],
  apigw: [
    ["AWS", "API Gateway"], ["Google Cloud", "API Gateway / Apigee"], ["Microsoft Azure", "API Management"], ["Kong", "Konnect", SAAS],
    ["Cloudflare", "API Gateway"], ["Zuplo", "Gateway", SAAS], ["Tyk", "Cloud", SAAS],
  ],
  proxy: [["nginx", "Self-hosted", SH], ["Caddy", "Self-hosted", SH], ["Traefik", "Self-hosted", SH], ["HAProxy", "Self-hosted", SH]],
  dns: [["AWS", "Route 53"], ["Google Cloud", "Cloud DNS"], ["Microsoft Azure", "DNS"], ["Cloudflare", "DNS"], ["NS1", "Managed DNS"]],
  waf: [["Cloudflare", "WAF + DDoS"], ["AWS", "WAF + Shield"], ["Microsoft Azure", "WAF"], ["Google Cloud", "Cloud Armor"], ["Fastly", "Next-Gen WAF"], ["Akamai", "App & API Protector"]],
  egress: [["AWS", "Internet data transfer"], ["Google Cloud", "Network egress"], ["Microsoft Azure", "Bandwidth"], ["Cloudflare", "No egress fees"], ["Hetzner", "Included traffic"], ["DigitalOcean", "Bandwidth"]],
  queue: [
    ["AWS", "SQS", M], ["Microsoft Azure", "Service Bus", M], ["Google Cloud", "Cloud Tasks", M], ["CloudAMQP", "RabbitMQ", M],
    ["Upstash", "QStash", S], ["Cloudflare", "Queues", S], ["RabbitMQ", "Self-hosted", SH], ["AWS", "Amazon MQ", M],
  ],
  pubsub: [
    ["AWS", "SNS", M], ["Google Cloud", "Pub/Sub", M], ["Microsoft Azure", "Event Grid", M], ["Ably", "Realtime", SAAS],
    ["Pusher", "Channels", SAAS], ["PubNub", "Realtime", SAAS], ["NATS", "Synadia Cloud", M], ["Supabase", "Realtime", M],
  ],
  stream: [
    ["Confluent", "Cloud", M], ["AWS", "MSK", M], ["AWS", "MSK Serverless", S], ["AWS", "Kinesis Data Streams", M], ["Redpanda", "Cloud", M],
    ["Aiven", "Kafka", M], ["Upstash", "Kafka", S], ["Microsoft Azure", "Event Hubs", M], ["Google Cloud", "Managed Service for Apache Kafka", M],
  ],
  workflow: [
    ["AWS", "Step Functions", S], ["Temporal", "Cloud", SAAS], ["AWS", "MWAA (Airflow)", M], ["Google Cloud", "Cloud Composer", M],
    ["Astronomer", "Astro", SAAS], ["Inngest", "Cloud", SAAS], ["Microsoft Azure", "Logic Apps", S], ["Prefect", "Cloud", SAAS],
  ],
  email: [["AWS", "SES"], ["SendGrid", "Email API"], ["Resend", "Email"], ["Postmark", "Email"], ["Mailgun", "Email"], ["Brevo", "Email"], ["Google", "Workspace SMTP relay"]],
  sms: [["Twilio", "SMS / Verify"], ["AWS", "SNS SMS / Pinpoint"], ["Firebase", "Cloud Messaging (push)"], ["OneSignal", "Push"], ["MessageBird", "SMS"], ["Vonage", "SMS"], ["Meta", "WhatsApp Business API"], ["Gupshup", "Messaging"], ["MSG91", "SMS / OTP"]],
  warehouse: [
    ["Google Cloud", "BigQuery"], ["Snowflake", "Data Cloud"], ["AWS", "Redshift"], ["Microsoft Azure", "Synapse Analytics"], ["Databricks", "SQL Warehouse"],
    ["ClickHouse", "Cloud", M], ["MotherDuck", "DuckDB cloud"], ["Firebolt", "Cloud"], ["Tinybird", "Cloud"],
  ],
  spark: [
    ["Databricks", "Jobs compute"], ["AWS", "EMR"], ["AWS", "EMR Serverless", S], ["Google Cloud", "Dataproc"], ["Microsoft Azure", "HDInsight / Synapse Spark"],
    ["Snowflake", "Snowpark"], ["Starburst", "Galaxy (Trino)"],
  ],
  streamproc: [
    ["AWS", "Managed Service for Apache Flink"], ["Google Cloud", "Dataflow"], ["Confluent", "Flink"], ["Ververica", "Cloud"],
    ["Microsoft Azure", "Stream Analytics"], ["Decodable", "Platform"], ["Materialize", "Cloud"],
  ],
  etl: [
    ["AWS", "Glue"], ["Fivetran", "Connectors", SAAS], ["Airbyte", "Cloud", SAAS], ["dbt Labs", "dbt Cloud", SAAS], ["Microsoft Azure", "Data Factory"],
    ["Matillion", "Data Productivity Cloud", SAAS], ["Google Cloud", "Data Fusion"], ["Estuary", "Flow", SAAS],
  ],
  lakehouse: [["Databricks", "Lakehouse Platform"], ["Snowflake", "Iceberg / Polaris"], ["Microsoft Azure", "Fabric"], ["AWS", "SageMaker Lakehouse"], ["Dremio", "Cloud"]],
  bi: [["Google", "Looker"], ["Tableau", "Cloud"], ["Microsoft", "Power BI"], ["AWS", "QuickSight"], ["Metabase", "Cloud"], ["Preset", "Superset Cloud"], ["Hex", "Platform"]],
  search: [
    ["Elastic", "Cloud", M], ["AWS", "OpenSearch Service", M], ["AWS", "OpenSearch Serverless", S], ["Algolia", "Search", SAAS],
    ["Typesense", "Cloud", M], ["Meilisearch", "Cloud", M], ["Microsoft Azure", "AI Search", M], ["Google Cloud", "Vertex AI Search", M],
  ],
  vector: [
    ["Pinecone", "Serverless", S], ["Qdrant", "Cloud", M], ["Weaviate", "Cloud", M], ["Zilliz", "Cloud (Milvus)", M],
    ["MongoDB", "Atlas Vector Search", M], ["Turbopuffer", "Vector DB", S], ["Supabase", "pgvector", M], ["Chroma", "Cloud", S],
  ],
  llm: [
    ["OpenAI", "API", SAAS], ["Anthropic", "Claude API", SAAS], ["Google", "Gemini API", SAAS], ["AWS", "Bedrock", SAAS],
    ["Microsoft Azure", "OpenAI Service", SAAS], ["Google Cloud", "Vertex AI", SAAS], ["Mistral", "API", SAAS], ["Cohere", "API", SAAS],
    ["Groq", "Cloud", SAAS], ["Together AI", "Inference", SAAS], ["Fireworks AI", "Inference", SAAS], ["DeepSeek", "API", SAAS],
    ["xAI", "Grok API", SAAS], ["OpenRouter", "Router", SAAS],
  ],
  embeddings: [["OpenAI", "Embeddings", SAAS], ["Cohere", "Embed", SAAS], ["Voyage AI", "Embeddings", SAAS], ["Google", "Gemini Embeddings", SAAS], ["Jina", "Embeddings", SAAS], ["AWS", "Titan Embeddings", SAAS]],
  speech: [
    ["OpenAI", "Whisper / TTS", SAAS], ["Deepgram", "Speech", SAAS], ["ElevenLabs", "Voice", SAAS], ["AssemblyAI", "Speech", SAAS],
    ["Google Cloud", "Speech-to-Text", SAAS], ["AWS", "Transcribe / Polly", SAAS], ["Microsoft Azure", "AI Speech", SAAS],
  ],
  vision: [["AWS", "Textract / Rekognition", SAAS], ["Google Cloud", "Document AI / Vision", SAAS], ["Microsoft Azure", "Document Intelligence", SAAS], ["Mistral", "OCR", SAAS], ["Roboflow", "Platform", SAAS]],
  inference: [
    ["AWS", "SageMaker Endpoints", M], ["Google Cloud", "Vertex AI Endpoints", M], ["Hugging Face", "Inference Endpoints", M], ["Replicate", "Models", S],
    ["Modal", "Inference", S], ["Baseten", "Model APIs", M], ["Together AI", "Dedicated Endpoints", M], ["RunPod", "Serverless", S],
  ],
  logs: [
    ["AWS", "CloudWatch Logs", M], ["Datadog", "Log Management", SAAS], ["Grafana", "Cloud Loki", SAAS], ["New Relic", "Logs", SAAS],
    ["Splunk", "Cloud", SAAS], ["Elastic", "Observability", SAAS], ["Better Stack", "Logs", SAAS], ["Axiom", "Logs", SAAS], ["Google Cloud", "Logging", M],
    ["Microsoft Azure", "Monitor Logs", M], ["Papertrail", "Logs", SAAS],
  ],
  metrics: [
    ["Datadog", "Infrastructure + APM", SAAS], ["Grafana", "Cloud", SAAS], ["New Relic", "Full-stack", SAAS], ["Dynatrace", "Platform", SAAS],
    ["AWS", "CloudWatch", M], ["Honeycomb", "Observability", SAAS], ["Google Cloud", "Monitoring", M], ["Microsoft Azure", "Application Insights", M],
  ],
  errors: [["Sentry", "Errors", SAAS], ["Rollbar", "Errors", SAAS], ["Bugsnag", "Errors", SAAS], ["Datadog", "Error Tracking", SAAS], ["Highlight", "Errors", SAAS]],
  tracing: [["Honeycomb", "Tracing", SAAS], ["Datadog", "APM traces", SAAS], ["Grafana", "Cloud Tempo", SAAS], ["AWS", "X-Ray", M], ["Lightstep", "Tracing", SAAS], ["Jaeger", "Self-hosted", SH]],
  auth: [
    ["Auth0", "Customer identity", SAAS], ["Clerk", "Auth", SAAS], ["AWS", "Cognito", M], ["Firebase", "Authentication", M], ["Supabase", "Auth", M],
    ["WorkOS", "AuthKit / SSO", SAAS], ["Okta", "Workforce / CIAM", SAAS], ["Stytch", "Auth", SAAS], ["Microsoft", "Entra External ID", SAAS],
    ["Keycloak", "Self-hosted", SH], ["Ory", "Network", SAAS],
  ],
  secrets: [
    ["AWS", "Secrets Manager / KMS"], ["Google Cloud", "Secret Manager / KMS"], ["Microsoft Azure", "Key Vault"], ["HashiCorp", "HCP Vault", SAAS],
    ["Doppler", "Secrets", SAAS], ["1Password", "Secrets Automation", SAAS], ["Infisical", "Cloud", SAAS],
  ],
  ci: [
    ["GitHub", "Actions", SAAS], ["GitLab", "CI/CD", SAAS], ["CircleCI", "Cloud", SAAS], ["Buildkite", "Pipelines", SAAS],
    ["AWS", "CodeBuild", M], ["Google Cloud", "Cloud Build", M], ["Vercel", "Builds", SAAS], ["Jenkins", "Self-hosted", SH],
  ],
  registry: [["AWS", "ECR"], ["Google Cloud", "Artifact Registry"], ["Microsoft Azure", "Container Registry"], ["Docker", "Hub"], ["GitHub", "Container registry"], ["DigitalOcean", "Container Registry"]],
  cron: [["AWS", "EventBridge Scheduler", S], ["Google Cloud", "Cloud Scheduler", M], ["Cloudflare", "Cron Triggers", S], ["GitHub", "Actions schedule", SAAS], ["Vercel", "Cron Jobs", S]],
  payments: [
    ["Stripe", "Payments", SAAS], ["Razorpay", "Payments", SAAS], ["Adyen", "Payments", SAAS], ["PayPal", "Braintree / Checkout", SAAS],
    ["Paddle", "Merchant of record", SAAS], ["Lemon Squeezy", "Merchant of record", SAAS], ["Square", "Payments", SAAS], ["Cashfree", "Payments", SAAS], ["PhonePe", "Payment Gateway", SAAS],
  ],
  maps: [["Google", "Maps Platform", SAAS], ["Mapbox", "Maps", SAAS], ["HERE", "Platform", SAAS], ["Azure", "Maps", SAAS], ["AWS", "Location Service", M], ["MapTiler", "Cloud", SAAS]],
  analytics: [
    ["PostHog", "Cloud", SAAS], ["Amplitude", "Analytics", SAAS], ["Mixpanel", "Analytics", SAAS], ["Google", "Analytics 4", SAAS],
    ["Segment", "CDP", SAAS], ["Plausible", "Analytics", SAAS], ["Heap", "Analytics", SAAS], ["RudderStack", "CDP", SAAS],
  ],
  flags: [["LaunchDarkly", "Feature management", SAAS], ["Statsig", "Experiments", SAAS], ["PostHog", "Feature flags", SAAS], ["GrowthBook", "Cloud", SAAS], ["Flagsmith", "Cloud", SAAS], ["Unleash", "Cloud", SAAS]],
  cms: [["Contentful", "Platform", SAAS], ["Sanity", "Content Lake", SAAS], ["Strapi", "Cloud", SAAS], ["Storyblok", "CMS", SAAS], ["Hygraph", "CMS", SAAS], ["Payload", "Cloud", SAAS]],
  media: [
    ["Mux", "Video", SAAS], ["Cloudflare", "Stream", SAAS], ["AWS", "MediaConvert / IVS", M], ["Vimeo", "OTT / API", SAAS], ["Bunny", "Stream", SAAS],
    ["Google Cloud", "Transcoder API", M], ["Microsoft Azure", "Media Services", M], ["api.video", "Video API", SAAS],
  ],
  images: [["Cloudinary", "Media", SAAS], ["imgix", "Rendering", SAAS], ["Cloudflare", "Images", SAAS], ["Vercel", "Image Optimization", SAAS], ["ImageKit", "Media", SAAS], ["Bunny", "Optimizer", SAAS]],
  rtc: [["Twilio", "Video / Voice", SAAS], ["LiveKit", "Cloud", SAAS], ["Daily", "Video API", SAAS], ["Agora", "RTC", SAAS], ["Vonage", "Video API", SAAS], ["Zoom", "Video SDK", SAAS], ["Cloudflare", "Realtime", SAAS]],
  iot: [["AWS", "IoT Core", M], ["Microsoft Azure", "IoT Hub", M], ["HiveMQ", "Cloud", M], ["EMQX", "Cloud", M], ["Particle", "Cloud", SAAS], ["Google Cloud", "Pub/Sub for devices", M]],
  cdc: [["Debezium", "Self-hosted", SH], ["AWS", "DMS", M], ["Confluent", "CDC connectors", M], ["Estuary", "Flow", SAAS], ["Fivetran", "HVR", SAAS], ["Google Cloud", "Datastream", M], ["Airbyte", "CDC", SAAS]],
  mltrain: [
    ["AWS", "SageMaker Training", M], ["Google Cloud", "Vertex AI Training", M], ["Databricks", "Mosaic AI", M], ["Microsoft Azure", "Machine Learning", M],
    ["Modal", "Training", S], ["Weights & Biases", "Platform", SAAS], ["Lambda", "1-Click Clusters", M], ["Hugging Face", "AutoTrain / Spaces", M],
  ],
  uptime: [["Better Stack", "Uptime", SAAS], ["Checkly", "Synthetics", SAAS], ["Pingdom", "Monitoring", SAAS], ["Datadog", "Synthetics", SAAS], ["UptimeRobot", "Monitoring", SAAS], ["AWS", "CloudWatch Synthetics", M], ["Uptime Kuma", "Self-hosted", SH]],
  backup: [["AWS", "Backup"], ["Backblaze", "Computer / B2 backup"], ["Veeam", "Data Cloud"], ["Google Cloud", "Backup and DR"], ["Microsoft Azure", "Backup"], ["Rubrik", "Security Cloud"]],
  chat: [["Stream", "Chat", SAAS], ["Twilio", "Conversations", SAAS], ["Sendbird", "Chat", SAAS], ["PubNub", "Chat", SAAS]],
};

const SELF_HOST_LABEL: Record<string, string> = {
  postgres: "PostgreSQL", mysql: "MySQL / MariaDB", mongodb: "MongoDB", redis: "Redis / Valkey", memcached: "Memcached",
  stream: "Apache Kafka", queue: "RabbitMQ", search: "Elasticsearch / OpenSearch", warehouse: "ClickHouse", object: "MinIO",
  vector: "Qdrant", proxy: "nginx / Caddy", app: "Your app (Node, Java, Python, Go...)", worker: "Your worker",
  logs: "Grafana Loki", metrics: "Prometheus + Grafana", auth: "Keycloak", workflow: "Apache Airflow",
};

function build(): Offering[] {
  const out: Offering[] = [];
  for (const [typeId, rows] of Object.entries(RAW)) {
    const seen = new Set<string>();
    const add = (provider: string, product: string, model: Model) => {
      let id = `${typeId}:${slug(provider)}:${slug(product)}`;
      while (seen.has(id)) id += "-2";
      seen.add(id);
      out.push({ id, typeId, provider, product, model });
    };
    for (const [provider, product, model] of rows) add(provider, product, model ?? M);
    const label = SELF_HOST_LABEL[typeId];
    const hostable = TYPE_BY_ID[typeId]?.hostable;
    if (hostable && label && !rows.some((r) => r[2] === SH && /self-hosted/i.test(r[0] + r[1]))) add("Self-hosted", label, SH);
  }
  return out;
}

export const OFFERINGS: Offering[] = build();
export const OFFERING_BY_ID: Record<string, Offering> = Object.fromEntries(OFFERINGS.map((o) => [o.id, o]));
const BY_TYPE = new Map<string, Offering[]>();
for (const o of OFFERINGS) BY_TYPE.set(o.typeId, [...(BY_TYPE.get(o.typeId) ?? []), o]);

export const offeringsOf = (typeId: string): Offering[] => BY_TYPE.get(typeId) ?? [];
export const selfHostedOf = (typeId: string): Offering | undefined => offeringsOf(typeId).find((o) => o.model === "self-hosted");
/** Default for a freshly added node: the first listed offering (never the self-hosted one). */
export const defaultOffering = (typeId: string): Offering | undefined => offeringsOf(typeId).find((o) => o.provider !== "Self-hosted") ?? offeringsOf(typeId)[0];
export const offeringLabel = (o: Offering | undefined) => (o ? (o.provider === "Self-hosted" ? o.product : `${o.provider} ${o.product}`) : "");

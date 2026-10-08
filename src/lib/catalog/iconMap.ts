/**
 * Which logo shows for which offering. Ids are "<set>:<name>" from the Iconify "logos" (colour) and
 * "simple-icons" (single colour) sets. The build script scans this file and bundles only what is used.
 * Resolution order: exact product (service icon) > provider (company logo) > the generic type icon.
 * Logos are trademarks of their owners and are shown only to identify the service they name.
 */
export const PRODUCT_ICON: Record<string, string> = {
  // AWS service icons
  "AWS|S3": "logos:aws-s3", "AWS|Lambda": "logos:aws-lambda", "AWS|EC2": "logos:aws-ec2", "AWS|Lightsail": "logos:aws-lightsail",
  "AWS|RDS for PostgreSQL": "logos:aws-rds", "AWS|RDS for MySQL": "logos:aws-rds", "AWS|RDS for MariaDB": "logos:aws-rds", "AWS|RDS for SQL Server": "logos:aws-rds",
  "AWS|Aurora PostgreSQL": "logos:aws-aurora", "AWS|Aurora MySQL": "logos:aws-aurora", "AWS|DynamoDB": "logos:aws-dynamodb",
  "AWS|CloudFront": "logos:aws-cloudfront", "AWS|SQS": "logos:aws-sqs", "AWS|SNS": "logos:aws-sns", "AWS|EKS": "logos:aws-eks",
  "AWS|ECS on Fargate": "logos:aws-fargate", "AWS|ECS on EC2": "logos:aws-ecs", "AWS|API Gateway": "logos:aws-api-gateway", "AWS|Route 53": "logos:aws-route53",
  "AWS|ElastiCache for Redis": "logos:aws-elasticache", "AWS|ElastiCache for Memcached": "logos:aws-elasticache", "AWS|Glue": "logos:aws-glue",
  "AWS|Kinesis Data Streams": "logos:aws-kinesis", "AWS|CloudWatch": "logos:aws-cloudwatch", "AWS|CloudWatch Logs": "logos:aws-cloudwatch",
  "AWS|Cognito": "logos:aws-cognito", "AWS|Amplify": "logos:aws-amplify", "AWS|Amplify Hosting": "logos:aws-amplify", "AWS|Secrets Manager / KMS": "logos:aws-secrets-manager",
  "AWS|SES": "logos:aws-ses", "AWS|Redshift": "logos:aws-redshift", "AWS|Step Functions": "logos:aws-step-functions",
  // Google Cloud service icons
  "Google Cloud|Cloud Run functions": "logos:google-cloud-functions", "Google Cloud|Cloud Run": "logos:google-cloud-run",
  "Google|Gemini API": "logos:google-gemini", "Google Cloud|Vertex AI": "logos:google-cloud",
  // Self-hosted software
  "Self-hosted|PostgreSQL": "logos:postgresql", "Self-hosted|MySQL / MariaDB": "logos:mysql", "Self-hosted|MongoDB": "logos:mongodb-icon",
  "Self-hosted|Redis / Valkey": "logos:redis", "Self-hosted|Apache Kafka": "logos:kafka-icon", "Self-hosted|Elasticsearch / OpenSearch": "logos:elasticsearch",
  "Self-hosted|Grafana Loki": "logos:grafana", "Self-hosted|Prometheus + Grafana": "logos:grafana", "nginx|Self-hosted": "logos:nginx",
  "Docker|Container on your server": "logos:docker-icon", "Docker|Hub": "logos:docker-icon", "Docker|Registry": "logos:docker-icon",
  "Grafana|Cloud Loki": "logos:grafana", "Grafana|Cloud": "logos:grafana",
};

export const PROVIDER_ICON: Record<string, string> = {
  AWS: "logos:aws", "Google Cloud": "logos:google-cloud", Google: "logos:google-icon", "Microsoft Azure": "logos:microsoft-azure", Azure: "logos:microsoft-azure",
  Microsoft: "logos:microsoft-icon", Cloudflare: "logos:cloudflare-icon", Neon: "logos:neon-icon", Supabase: "logos:supabase-icon", PlanetScale: "logos:planetscale",
  MongoDB: "logos:mongodb-icon", Redis: "logos:redis", Upstash: "logos:upstash", DigitalOcean: "simple-icons:digitalocean", Hostinger: "simple-icons:hostinger",
  Hetzner: "simple-icons:hetzner", Vultr: "logos:vultr", "Akamai (Linode)": "logos:linode", Akamai: "simple-icons:akamai", Backblaze: "simple-icons:backblaze",
  Wasabi: "simple-icons:wasabi", OpenAI: "logos:openai-icon", Anthropic: "logos:anthropic-icon", Mistral: "logos:mistral-ai-icon", Stripe: "logos:stripe",
  Razorpay: "simple-icons:razorpay", Twilio: "logos:twilio-icon", Datadog: "logos:datadog", Sentry: "logos:sentry-icon", Grafana: "logos:grafana",
  Snowflake: "logos:snowflake-icon", Databricks: "logos:databricks-icon", Vercel: "logos:vercel-icon", Netlify: "logos:netlify", Heroku: "logos:heroku-icon",
  Docker: "logos:docker-icon", nginx: "logos:nginx", Elastic: "logos:elasticsearch", Algolia: "logos:algolia", Pinecone: "logos:pinecone", Auth0: "logos:auth0",
  Clerk: "logos:clerk-icon", Firebase: "logos:firebase", SendGrid: "logos:sendgrid", "New Relic": "logos:new-relic", GitHub: "logos:github-icon", GitLab: "logos:gitlab",
  CircleCI: "logos:circleci", "Fly.io": "logos:fly-icon", Render: "simple-icons:render", Railway: "logos:railway", Segment: "logos:segment", PostHog: "logos:posthog",
  LaunchDarkly: "logos:launchdarkly", Contentful: "logos:contentful", Sanity: "logos:sanity", Fastly: "logos:fastly", Okta: "logos:okta", Mapbox: "logos:mapbox",
  Temporal: "logos:temporal", Airbyte: "simple-icons:airbyte", GoDaddy: "simple-icons:godaddy", Namecheap: "logos:namecheap", IONOS: "simple-icons:ionos",
  HostGator: "logos:hostgator", OVHcloud: "simple-icons:ovh", Scaleway: "simple-icons:scaleway", Contabo: "simple-icons:contabo", "Oracle Cloud": "logos:oracle",
  Kubernetes: "logos:kubernetes", Cohere: "", Confluent: "",
};

/** Types whose own icon should be a brand mark even before a provider is chosen. */
export const TYPE_ICON: Record<string, string> = { container: "logos:docker-icon" };

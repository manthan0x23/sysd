// AWS: public Price List bulk files, no key. https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<code>/current/<region>/index.json
// Generic flattener: every on-demand price becomes one rate row with its unit, description and all product
// attributes (vCPU, memory, engine, ... where AWS provides them). Region: US East (N. Virginia).
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { OUT_DIR } from "./lib.mjs";

const REGION = "us-east-1";
const BASE = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws";
// service code -> catalog offerings it prices (for traceability) and an optional row filter
export const AWS_SERVICES = {
  AmazonEC2: { offerings: ["vps:aws:ec2", "gpu:aws:ec2-gpu-instances", "block:aws:ebs", "egress:aws:internet-data-transfer"], keep: (a, fam) => (a.operation === "RunInstances" && a.tenancy === "Shared" && a.operatingSystem === "Linux" && a.preInstalledSw === "NA" && a.capacitystatus === "Used") || ["Storage", "System Operation", "Provisioned Throughput", "Data Transfer", "Storage Snapshot", "NAT Gateway", "IP Address"].includes(fam) },
  AmazonLightsail: { offerings: ["vps:aws:lightsail"] },
  AWSLambda: { offerings: ["fn:aws:lambda"] },
  AWSAppRunner: { offerings: ["app:aws:app-runner"] },
  AmazonECS: { offerings: ["containers:aws:ecs-on-fargate", "containers:aws:ecs-on-ec2"] },
  AmazonEKS: { offerings: ["k8s:aws:eks"] },
  AWSAmplify: { offerings: ["static:aws:amplify-hosting", "baas:aws:amplify"] },
  AmazonRDS: { offerings: ["postgres:aws:rds-for-postgresql", "postgres:aws:aurora-postgresql", "mysql:aws:rds-for-mysql", "mysql:aws:aurora-mysql", "mysql:aws:rds-for-mariadb", "sqlserver:aws:rds-for-sql-server"], keep: (a) => !/oracle|db2|custom/i.test(a.databaseEngine ?? "") },
  AmazonDocDB: { offerings: ["mongodb:aws:documentdb"] },
  AmazonDynamoDB: { offerings: ["kv:aws:dynamodb"] },
  AmazonMCS: { offerings: ["kv:aws:keyspaces"] },
  AuroraDSQL: { offerings: ["newsql:aws:aurora-dsql"] },
  AmazonNeptune: { offerings: ["graph:aws:neptune"] },
  AmazonTimestream: { offerings: ["timeseries:aws:timestream"] },
  AmazonElastiCache: { offerings: ["redis:aws:elasticache-for-redis", "memcached:aws:elasticache-for-memcached"] },
  AmazonMemoryDB: { offerings: ["redis:aws:memorydb"] },
  AmazonS3: { offerings: ["object:aws:s3"] },
  AmazonEFS: { offerings: ["file:aws:efs"] },
  AmazonFSx: { offerings: ["file:aws:fsx"] },
  AmazonGlacier: { offerings: ["archive:aws:s3-glacier"] },
  AmazonS3GlacierDeepArchive: { offerings: ["archive:aws:s3-glacier"] },
  AWSELB: { offerings: ["lb:aws:application-load-balancer", "lb:aws:network-load-balancer"] },
  AmazonCloudFront: { offerings: ["cdn:aws:cloudfront"] },
  AmazonApiGateway: { offerings: ["apigw:aws:api-gateway"] },
  AmazonRoute53: { offerings: ["dns:aws:route-53"] },
  awswaf: { offerings: ["waf:aws:waf-shield"] },
  AWSShield: { offerings: ["waf:aws:waf-shield"] },
  AWSQueueService: { offerings: ["queue:aws:sqs"] },
  AmazonMQ: { offerings: ["queue:aws:amazon-mq"] },
  AmazonSNS: { offerings: ["pubsub:aws:sns", "sms:aws:sns-sms-pinpoint"] },
  AmazonMSK: { offerings: ["stream:aws:msk", "stream:aws:msk-serverless"] },
  AmazonKinesis: { offerings: ["stream:aws:kinesis-data-streams"] },
  AmazonStates: { offerings: ["workflow:aws:step-functions"] },
  AmazonMWAA: { offerings: ["workflow:aws:mwaa-airflow"] },
  AmazonSES: { offerings: ["email:aws:ses"] },
  AmazonRedshift: { offerings: ["warehouse:aws:redshift"] },
  ElasticMapReduce: { offerings: ["spark:aws:emr", "spark:aws:emr-serverless"] },
  AmazonKinesisAnalytics: { offerings: ["streamproc:aws:managed-service-for-apache-flink"] },
  AWSGlue: { offerings: ["etl:aws:glue"] },
  AmazonQuickSight: { offerings: ["bi:aws:quicksight"] },
  AmazonES: { offerings: ["search:aws:opensearch-service", "search:aws:opensearch-serverless"] },
  AmazonBedrock: { offerings: ["llm:aws:bedrock"] },
  AmazonBedrockService: { offerings: ["llm:aws:bedrock"] },
  AmazonPolly: { offerings: ["speech:aws:transcribe-polly"] },
  transcribe: { offerings: ["speech:aws:transcribe-polly"] },
  AmazonRekognition: { offerings: ["vision:aws:textract-rekognition"] },
  AmazonTextract: { offerings: ["vision:aws:textract-rekognition"] },
  AmazonSageMaker: { offerings: ["inference:aws:sagemaker-endpoints", "mltrain:aws:sagemaker-training"] },
  AmazonCloudWatch: { offerings: ["logs:aws:cloudwatch-logs", "metrics:aws:cloudwatch", "uptime:aws:cloudwatch-synthetics"] },
  AWSXRay: { offerings: ["tracing:aws:x-ray"] },
  AmazonCognito: { offerings: ["auth:aws:cognito"] },
  AWSSecretsManager: { offerings: ["secrets:aws:secrets-manager-kms"] },
  awskms: { offerings: ["secrets:aws:secrets-manager-kms"] },
  CodeBuild: { offerings: ["ci:aws:codebuild"] },
  AmazonECR: { offerings: ["registry:aws:ecr"] },
  AmazonLocationService: { offerings: ["maps:aws:location-service"] },
  AWSElementalMediaConvert: { offerings: ["media:aws:mediaconvert-ivs"] },
  AWSIoT: { offerings: ["iot:aws:iot-core"] },
  AWSDatabaseMigrationSvc: { offerings: ["cdc:aws:dms"] },
  AWSBackup: { offerings: ["backup:aws:backup"] },
};
const NOISE = new Set(["servicecode", "servicename", "location", "locationType", "regionCode"]);

export async function run(only) {
  await mkdir(OUT_DIR, { recursive: true });
  const summary = {};
  for (const [code, cfg] of Object.entries(AWS_SERVICES)) {
    if (only?.length && !only.includes(code)) continue;
    const url = `${BASE}/${code}/current/${REGION}/index.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(600_000) });
    if (!res.ok) { summary[code] = `HTTP ${res.status}`; continue; }
    const j = await res.json();
    const rows = [];
    for (const [sku, p] of Object.entries(j.products)) {
      const a = p.attributes ?? {};
      if (cfg.keep && !cfg.keep(a, p.productFamily)) continue;
      const terms = j.terms?.OnDemand?.[sku];
      if (!terms) continue;
      for (const t of Object.values(terms)) for (const d of Object.values(t.priceDimensions)) {
        const usd = Number(d.pricePerUnit?.USD);
        if (!Number.isFinite(usd)) continue;
        rows.push({
          sku, family: p.productFamily, usagetype: a.usagetype, operation: a.operation, description: d.description, unit: d.unit, usd,
          begin: d.beginRange, end: d.endRange,
          attrs: Object.fromEntries(Object.entries(a).filter(([k]) => !NOISE.has(k))),
        });
      }
    }
    const doc = { provider: "aws", service: code, offerings: cfg.offerings, region: REGION, currency: "USD", fetchedAt: new Date().toISOString(), status: "pending", priceListVersion: j.version, publicationDate: j.publicationDate, source: url, count: rows.length, rates: rows };
    await writeFile(join(OUT_DIR, `aws__${code}.json`), JSON.stringify(doc));
    summary[code] = rows.length;
  }
  return summary;
}

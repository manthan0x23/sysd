CREATE TYPE "public"."price_source_kind" AS ENUM('api', 'scrape');--> statement-breakpoint
CREATE TYPE "public"."price_status" AS ENUM('pending', 'approved', 'rejected', 'superseded');--> statement-breakpoint
CREATE TABLE "price_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"service" text NOT NULL,
	"offerings" text[] DEFAULT '{}'::text[] NOT NULL,
	"region" text,
	"sku" text,
	"key" text NOT NULL,
	"description" text,
	"unit" text NOT NULL,
	"amount" numeric(24, 10) NOT NULL,
	"currency" text NOT NULL,
	"tier_min" numeric(24, 6),
	"attrs" jsonb,
	"status" "price_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"tier_count" integer NOT NULL,
	"rate_count" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_snapshots_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "price_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"kind" "price_source_kind" NOT NULL,
	"url" text NOT NULL,
	"urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"version" text,
	"notes" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"offerings" text[] NOT NULL,
	"tier" text NOT NULL,
	"region" text,
	"key" text NOT NULL,
	"spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"amount" numeric(20, 6),
	"unit" text,
	"currency" text NOT NULL,
	"hourly" numeric(20, 8),
	"rates" jsonb,
	"extra" jsonb,
	"note" text,
	"status" "price_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_rates" ADD CONSTRAINT "price_rates_source_id_price_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."price_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_source_id_price_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."price_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "price_rates_source_key_uq" ON "price_rates" USING btree ("source_id","key");--> statement-breakpoint
CREATE INDEX "price_rates_provider_idx" ON "price_rates" USING btree ("provider","service","status");--> statement-breakpoint
CREATE INDEX "price_rates_offerings_idx" ON "price_rates" USING gin ("offerings");--> statement-breakpoint
CREATE INDEX "price_sources_provider_idx" ON "price_sources" USING btree ("provider","fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "price_tiers_source_key_uq" ON "price_tiers" USING btree ("source_id","key");--> statement-breakpoint
CREATE INDEX "price_tiers_provider_idx" ON "price_tiers" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "price_tiers_key_idx" ON "price_tiers" USING btree ("key");--> statement-breakpoint
CREATE INDEX "price_tiers_offerings_idx" ON "price_tiers" USING gin ("offerings");
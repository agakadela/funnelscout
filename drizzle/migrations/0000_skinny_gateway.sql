CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"sub_account_id" text NOT NULL,
	"triggered_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"metrics_json" jsonb,
	"report_json" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cost_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"model" text NOT NULL,
	"step" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_usd" numeric(10, 6) NOT NULL,
	"triggered_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"sub_account_id" text NOT NULL,
	"ghl_opportunity_id" text NOT NULL,
	"ghl_event_id" text,
	"ghl_contact_id" text NOT NULL,
	"ghl_pipeline_id" text NOT NULL,
	"ghl_pipeline_stage_id" text NOT NULL,
	"event_type" text NOT NULL,
	"monetary_value" numeric(12, 2),
	"status" text,
	"raw_payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opp_events_ghl_event_id_unique" UNIQUE("ghl_event_id"),
	CONSTRAINT "opp_events_idempotency_fallback" UNIQUE("ghl_opportunity_id","event_type","ghl_pipeline_stage_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"better_auth_organization_id" text,
	"ghl_agency_id" text,
	"ghl_access_token" text,
	"ghl_refresh_token" text,
	"ghl_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_better_auth_organization_id_unique" UNIQUE("better_auth_organization_id"),
	CONSTRAINT "organizations_ghl_agency_id_unique" UNIQUE("ghl_agency_id")
);
--> statement-breakpoint
CREATE TABLE "sub_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"ghl_location_id" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sub_accounts_ghl_location_id_unique" UNIQUE("ghl_location_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"plan" text NOT NULL,
	"sub_account_limit" integer NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_sub_account_id_sub_accounts_id_fk" FOREIGN KEY ("sub_account_id") REFERENCES "public"."sub_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_logs" ADD CONSTRAINT "cost_logs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_sub_account_id_sub_accounts_id_fk" FOREIGN KEY ("sub_account_id") REFERENCES "public"."sub_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_accounts" ADD CONSTRAINT "sub_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_sub_account_created_idx" ON "analyses" USING btree ("sub_account_id","created_at");--> statement-breakpoint
CREATE INDEX "analyses_org_created_idx" ON "analyses" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "cost_logs_analysis_idx" ON "cost_logs" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "opp_events_sub_account_occurred_idx" ON "opportunity_events" USING btree ("sub_account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "opp_events_ghl_opp_idx" ON "opportunity_events" USING btree ("ghl_opportunity_id");--> statement-breakpoint
CREATE INDEX "sub_accounts_org_idx" ON "sub_accounts" USING btree ("organization_id");
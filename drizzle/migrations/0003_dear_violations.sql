ALTER TABLE "organizations" ADD COLUMN "preferences_email_notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "preferences_weekly_digest_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "preferences_timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "preferences_digest_day_of_week" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "preferences_digest_local_hour" integer DEFAULT 9 NOT NULL;

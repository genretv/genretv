ALTER TABLE "personal_season" ADD COLUMN "release_precision" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "date_confidence" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "release_window" jsonb;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "finale_window" jsonb;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "sort_key" varchar(40);--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "source_row" integer DEFAULT 1000000 NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "organizations" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "external_links" jsonb DEFAULT '[]' NOT NULL;
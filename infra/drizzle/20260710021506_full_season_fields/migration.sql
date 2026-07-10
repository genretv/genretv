ALTER TABLE "canonical_season" ADD COLUMN "season_number" integer;--> statement-breakpoint
ALTER TABLE "canonical_season" ADD COLUMN "title" varchar(300);--> statement-breakpoint
ALTER TABLE "canonical_season" ADD COLUMN "release_kind" varchar(24) DEFAULT 'season' NOT NULL;--> statement-breakpoint
ALTER TABLE "canonical_season" ADD COLUMN "is_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "canonical_show" ADD COLUMN "lifecycle_status" varchar(24) DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "canonical_show" ADD COLUMN "ended_reason" varchar(400);--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "season_number" integer;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "title" varchar(300);--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "release_kind" varchar(24) DEFAULT 'season' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_season" ADD COLUMN "is_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_show" ADD COLUMN "lifecycle_status" varchar(24) DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_show" ADD COLUMN "ended_reason" varchar(400);--> statement-breakpoint
ALTER TABLE "published_season" ADD COLUMN "season_number" integer;--> statement-breakpoint
ALTER TABLE "published_season" ADD COLUMN "title" varchar(300);--> statement-breakpoint
ALTER TABLE "published_season" ADD COLUMN "release_kind" varchar(24) DEFAULT 'season' NOT NULL;--> statement-breakpoint
ALTER TABLE "published_season" ADD COLUMN "is_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "published_show" ADD COLUMN "lifecycle_status" varchar(24) DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "published_show" ADD COLUMN "ended_reason" varchar(400);--> statement-breakpoint
ALTER TABLE "canonical_season" ALTER COLUMN "season_label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_season" ALTER COLUMN "season_label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "published_season" ALTER COLUMN "season_label" DROP NOT NULL;

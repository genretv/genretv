CREATE TABLE "canonical_episode" (
	"id" uuid PRIMARY KEY,
	"season_id" uuid NOT NULL,
	"episode_label" varchar(80),
	"title" varchar(300),
	"release_window" jsonb,
	"sort_key" varchar(40),
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_episode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "canonical_season" (
	"id" uuid PRIMARY KEY,
	"show_id" uuid NOT NULL,
	"section" varchar(24) NOT NULL,
	"season_label" varchar(80) NOT NULL,
	"timing" varchar(400) DEFAULT '' NOT NULL,
	"ended_reason" varchar(400) DEFAULT '' NOT NULL,
	"release_pattern" varchar(40),
	"release_precision" varchar(40) DEFAULT 'unknown' NOT NULL,
	"date_confidence" varchar(40) DEFAULT 'unknown' NOT NULL,
	"release_window" jsonb,
	"finale_window" jsonb,
	"sort_key" varchar(40),
	"episode_count" integer,
	"source_row" integer NOT NULL,
	"organizations" jsonb DEFAULT '[]' NOT NULL,
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_season" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "canonical_show" (
	"id" uuid PRIMARY KEY,
	"display_title" varchar(300) NOT NULL,
	"original_title" varchar(300),
	"languages" jsonb DEFAULT '[]' NOT NULL,
	"countries" jsonb DEFAULT '[]' NOT NULL,
	"genre_tags" jsonb DEFAULT '[]' NOT NULL,
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_show" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "canonical_episode" ADD CONSTRAINT "canonical_episode_season_id_canonical_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "canonical_season" ADD CONSTRAINT "canonical_season_show_id_canonical_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
CREATE POLICY "canonical_episode_public_read" ON "canonical_episode" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "canonical_season_public_read" ON "canonical_season" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "canonical_show_public_read" ON "canonical_show" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);
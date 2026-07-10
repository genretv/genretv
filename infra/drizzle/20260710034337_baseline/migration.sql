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
CREATE TABLE "canonical_proposal" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"proposal_kind" varchar(32) DEFAULT 'season' NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"title" varchar(300) NOT NULL,
	"message" varchar(4000),
	"personal_show_id" uuid,
	"personal_season_id" uuid,
	"personal_episode_id" uuid,
	"canonical_show_id" uuid,
	"canonical_season_id" uuid,
	"canonical_episode_id" uuid,
	"proposed_payload" jsonb DEFAULT '{}' NOT NULL,
	"reviewer_id" uuid,
	"reviewer_note" varchar(4000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_proposal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "canonical_season" (
	"id" uuid PRIMARY KEY,
	"show_id" uuid NOT NULL,
	"section" varchar(24) NOT NULL,
	"season_number" integer,
	"season_label" varchar(80),
	"title" varchar(300),
	"release_kind" varchar(24) DEFAULT 'season' NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"timing" varchar(400) DEFAULT '' NOT NULL,
	"release_pattern" varchar(40),
	"release_precision" varchar(40) DEFAULT 'unknown' NOT NULL,
	"date_confidence" varchar(40) DEFAULT 'unknown' NOT NULL,
	"release_window" jsonb,
	"finale_window" jsonb,
	"sort_key" varchar(40),
	"episode_count" integer,
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
	"lifecycle_status" varchar(24) DEFAULT 'open' NOT NULL,
	"ended_reason" varchar(400),
	"notes" varchar(8000),
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canonical_show" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "list_import" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"source_published_list_id" uuid NOT NULL,
	"source_published_show_id" uuid,
	"source_published_season_id" uuid,
	"source_published_episode_id" uuid,
	"target_personal_show_id" uuid,
	"target_personal_season_id" uuid,
	"target_personal_episode_id" uuid,
	"import_mode" varchar(32) DEFAULT 'linked' NOT NULL,
	"imported_kind" varchar(32) DEFAULT 'season' NOT NULL,
	"notes" varchar(4000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_import" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "maintainer_notification" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"notification_kind" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'unread' NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" varchar(4000),
	"related_publish_application_id" uuid,
	"related_canonical_proposal_id" uuid,
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintainer_notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "personal_episode" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"canonical_show_id" uuid,
	"canonical_season_id" uuid,
	"canonical_episode_id" uuid,
	"personal_season_id" uuid,
	"episode_label" varchar(80),
	"title" varchar(300),
	"release_window" jsonb,
	"sort_key" varchar(40),
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_episode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "personal_list_exclusion" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"excluded_kind" varchar(32) NOT NULL,
	"canonical_show_id" uuid,
	"canonical_season_id" uuid,
	"canonical_episode_id" uuid,
	"reason" varchar(1000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "personal_season" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"personal_show_id" uuid,
	"canonical_show_id" uuid,
	"canonical_season_id" uuid,
	"section" varchar(24) NOT NULL,
	"season_number" integer,
	"season_label" varchar(80),
	"title" varchar(300),
	"release_kind" varchar(24) DEFAULT 'season' NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"timing" varchar(400) DEFAULT '' NOT NULL,
	"release_pattern" varchar(40),
	"release_precision" varchar(40) DEFAULT 'unknown' NOT NULL,
	"date_confidence" varchar(40) DEFAULT 'unknown' NOT NULL,
	"release_window" jsonb,
	"finale_window" jsonb,
	"sort_key" varchar(40),
	"episode_count" integer,
	"organizations" jsonb DEFAULT '[]' NOT NULL,
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_season" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "personal_show" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"canonical_show_id" uuid,
	"display_title" varchar(300) NOT NULL,
	"original_title" varchar(300),
	"languages" jsonb DEFAULT '[]' NOT NULL,
	"countries" jsonb DEFAULT '[]' NOT NULL,
	"genre_tags" jsonb DEFAULT '[]' NOT NULL,
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"lifecycle_status" varchar(24) DEFAULT 'open' NOT NULL,
	"ended_reason" varchar(400),
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_show" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "publish_application" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"message" varchar(4000),
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"reviewer_id" uuid,
	"reviewer_note" varchar(4000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "publish_application" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "published_episode" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"published_list_id" uuid NOT NULL,
	"published_season_id" uuid NOT NULL,
	"snapshot_version" integer NOT NULL,
	"publication_status" varchar(32) DEFAULT 'draft' NOT NULL,
	"source_personal_episode_id" uuid,
	"canonical_episode_id" uuid,
	"episode_label" varchar(80),
	"title" varchar(300),
	"release_window" jsonb,
	"sort_key" varchar(40),
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "published_episode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "published_list" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(4000),
	"publication_status" varchar(32) DEFAULT 'draft' NOT NULL,
	"snapshot_version" integer DEFAULT 0 NOT NULL,
	"published_at_us" bigint,
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "published_list" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "published_season" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"published_list_id" uuid NOT NULL,
	"published_show_id" uuid NOT NULL,
	"snapshot_version" integer NOT NULL,
	"publication_status" varchar(32) DEFAULT 'draft' NOT NULL,
	"source_personal_season_id" uuid,
	"canonical_season_id" uuid,
	"section" varchar(24) NOT NULL,
	"season_number" integer,
	"season_label" varchar(80),
	"title" varchar(300),
	"release_kind" varchar(24) DEFAULT 'season' NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"timing" varchar(400) DEFAULT '' NOT NULL,
	"release_pattern" varchar(40),
	"release_precision" varchar(40) DEFAULT 'unknown' NOT NULL,
	"date_confidence" varchar(40) DEFAULT 'unknown' NOT NULL,
	"release_window" jsonb,
	"finale_window" jsonb,
	"sort_key" varchar(40),
	"episode_count" integer,
	"organizations" jsonb DEFAULT '[]' NOT NULL,
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "published_season" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "published_show" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"published_list_id" uuid NOT NULL,
	"snapshot_version" integer NOT NULL,
	"publication_status" varchar(32) DEFAULT 'draft' NOT NULL,
	"source_personal_show_id" uuid,
	"canonical_show_id" uuid,
	"display_title" varchar(300) NOT NULL,
	"original_title" varchar(300),
	"languages" jsonb DEFAULT '[]' NOT NULL,
	"countries" jsonb DEFAULT '[]' NOT NULL,
	"genre_tags" jsonb DEFAULT '[]' NOT NULL,
	"external_links" jsonb DEFAULT '[]' NOT NULL,
	"lifecycle_status" varchar(24) DEFAULT 'open' NOT NULL,
	"ended_reason" varchar(400),
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "published_show" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"public_slug" varchar(120),
	"bio" varchar(2000),
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_season_show_kind_number_unique" ON "canonical_season" ("show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_episode_owner_canonical_episode_unique" ON "personal_episode" ("owner_id","canonical_episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_exclusion_owner_show_unique" ON "personal_list_exclusion" ("owner_id","canonical_show_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_exclusion_owner_season_unique" ON "personal_list_exclusion" ("owner_id","canonical_season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_exclusion_owner_episode_unique" ON "personal_list_exclusion" ("owner_id","canonical_episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_season_owner_canonical_season_unique" ON "personal_season" ("owner_id","canonical_season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_season_owner_show_kind_number_unique" ON "personal_season" ("owner_id","personal_show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_season_owner_canonical_show_kind_number_unique" ON "personal_season" ("owner_id","canonical_show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_show_owner_canonical_show_unique" ON "personal_show" ("owner_id","canonical_show_id");--> statement-breakpoint
CREATE UNIQUE INDEX "published_episode_list_source_unique" ON "published_episode" ("published_list_id","source_personal_episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "published_list_slug_unique" ON "published_list" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "published_season_list_source_unique" ON "published_season" ("published_list_id","source_personal_season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "published_season_show_kind_number_unique" ON "published_season" ("published_list_id","published_show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "published_show_list_source_unique" ON "published_show" ("published_list_id","source_personal_show_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_owner_unique" ON "user_profile" ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_public_slug_unique" ON "user_profile" ("public_slug");--> statement-breakpoint
ALTER TABLE "canonical_episode" ADD CONSTRAINT "canonical_episode_season_id_canonical_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD CONSTRAINT "canonical_proposal_personal_show_id_personal_show_id_fkey" FOREIGN KEY ("personal_show_id") REFERENCES "personal_show"("id");--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD CONSTRAINT "canonical_proposal_personal_season_id_personal_season_id_fkey" FOREIGN KEY ("personal_season_id") REFERENCES "personal_season"("id");--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD CONSTRAINT "canonical_proposal_personal_episode_id_personal_episode_id_fkey" FOREIGN KEY ("personal_episode_id") REFERENCES "personal_episode"("id");--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD CONSTRAINT "canonical_proposal_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD CONSTRAINT "canonical_proposal_canonical_season_id_canonical_season_id_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD CONSTRAINT "canonical_proposal_oKCptfz8mr7t_fkey" FOREIGN KEY ("canonical_episode_id") REFERENCES "canonical_episode"("id");--> statement-breakpoint
ALTER TABLE "canonical_season" ADD CONSTRAINT "canonical_season_show_id_canonical_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_source_published_list_id_published_list_id_fkey" FOREIGN KEY ("source_published_list_id") REFERENCES "published_list"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_source_published_show_id_published_show_id_fkey" FOREIGN KEY ("source_published_show_id") REFERENCES "published_show"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_source_published_season_id_published_season_id_fkey" FOREIGN KEY ("source_published_season_id") REFERENCES "published_season"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_bofvP95FmDBQ_fkey" FOREIGN KEY ("source_published_episode_id") REFERENCES "published_episode"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_target_personal_show_id_personal_show_id_fkey" FOREIGN KEY ("target_personal_show_id") REFERENCES "personal_show"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_target_personal_season_id_personal_season_id_fkey" FOREIGN KEY ("target_personal_season_id") REFERENCES "personal_season"("id");--> statement-breakpoint
ALTER TABLE "list_import" ADD CONSTRAINT "list_import_target_personal_episode_id_personal_episode_id_fkey" FOREIGN KEY ("target_personal_episode_id") REFERENCES "personal_episode"("id");--> statement-breakpoint
ALTER TABLE "maintainer_notification" ADD CONSTRAINT "maintainer_notification_fBign1nlz36K_fkey" FOREIGN KEY ("related_publish_application_id") REFERENCES "publish_application"("id");--> statement-breakpoint
ALTER TABLE "maintainer_notification" ADD CONSTRAINT "maintainer_notification_ayIpufHx4ZOs_fkey" FOREIGN KEY ("related_canonical_proposal_id") REFERENCES "canonical_proposal"("id");--> statement-breakpoint
ALTER TABLE "personal_episode" ADD CONSTRAINT "personal_episode_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "personal_episode" ADD CONSTRAINT "personal_episode_canonical_season_id_canonical_season_id_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "personal_episode" ADD CONSTRAINT "personal_episode_canonical_episode_id_canonical_episode_id_fkey" FOREIGN KEY ("canonical_episode_id") REFERENCES "canonical_episode"("id");--> statement-breakpoint
ALTER TABLE "personal_episode" ADD CONSTRAINT "personal_episode_personal_season_id_personal_season_id_fkey" FOREIGN KEY ("personal_season_id") REFERENCES "personal_season"("id");--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ADD CONSTRAINT "personal_list_exclusion_4RtAnh6OWmc8_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ADD CONSTRAINT "personal_list_exclusion_YaLsWMaIZ4BG_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ADD CONSTRAINT "personal_list_exclusion_iwwIDM5iS57m_fkey" FOREIGN KEY ("canonical_episode_id") REFERENCES "canonical_episode"("id");--> statement-breakpoint
ALTER TABLE "personal_season" ADD CONSTRAINT "personal_season_personal_show_id_personal_show_id_fkey" FOREIGN KEY ("personal_show_id") REFERENCES "personal_show"("id");--> statement-breakpoint
ALTER TABLE "personal_season" ADD CONSTRAINT "personal_season_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "personal_season" ADD CONSTRAINT "personal_season_canonical_season_id_canonical_season_id_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "personal_show" ADD CONSTRAINT "personal_show_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "published_episode" ADD CONSTRAINT "published_episode_published_list_id_published_list_id_fkey" FOREIGN KEY ("published_list_id") REFERENCES "published_list"("id");--> statement-breakpoint
ALTER TABLE "published_episode" ADD CONSTRAINT "published_episode_published_season_id_published_season_id_fkey" FOREIGN KEY ("published_season_id") REFERENCES "published_season"("id");--> statement-breakpoint
ALTER TABLE "published_episode" ADD CONSTRAINT "published_episode_ONChRIOUCm6Q_fkey" FOREIGN KEY ("source_personal_episode_id") REFERENCES "personal_episode"("id");--> statement-breakpoint
ALTER TABLE "published_episode" ADD CONSTRAINT "published_episode_h0XasydnetDq_fkey" FOREIGN KEY ("canonical_episode_id") REFERENCES "canonical_episode"("id");--> statement-breakpoint
ALTER TABLE "published_season" ADD CONSTRAINT "published_season_published_list_id_published_list_id_fkey" FOREIGN KEY ("published_list_id") REFERENCES "published_list"("id");--> statement-breakpoint
ALTER TABLE "published_season" ADD CONSTRAINT "published_season_published_show_id_published_show_id_fkey" FOREIGN KEY ("published_show_id") REFERENCES "published_show"("id");--> statement-breakpoint
ALTER TABLE "published_season" ADD CONSTRAINT "published_season_5BOOz6FPVeik_fkey" FOREIGN KEY ("source_personal_season_id") REFERENCES "personal_season"("id");--> statement-breakpoint
ALTER TABLE "published_season" ADD CONSTRAINT "published_season_canonical_season_id_canonical_season_id_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "published_show" ADD CONSTRAINT "published_show_published_list_id_published_list_id_fkey" FOREIGN KEY ("published_list_id") REFERENCES "published_list"("id");--> statement-breakpoint
ALTER TABLE "published_show" ADD CONSTRAINT "published_show_source_personal_show_id_personal_show_id_fkey" FOREIGN KEY ("source_personal_show_id") REFERENCES "personal_show"("id");--> statement-breakpoint
ALTER TABLE "published_show" ADD CONSTRAINT "published_show_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
CREATE POLICY "canonical_episode_public_read" ON "canonical_episode" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "canonical_episode_canonical_maintainer_insert" ON "canonical_episode" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_episode_canonical_maintainer_update" ON "canonical_episode" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )) WITH CHECK (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_episode_canonical_maintainer_delete" ON "canonical_episode" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_proposal_select_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "canonical_proposal_insert_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "canonical_proposal_update_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "canonical_proposal_delete_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "canonical_season_public_read" ON "canonical_season" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "canonical_season_canonical_maintainer_insert" ON "canonical_season" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_season_canonical_maintainer_update" ON "canonical_season" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )) WITH CHECK (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_season_canonical_maintainer_delete" ON "canonical_season" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_show_public_read" ON "canonical_show" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "canonical_show_canonical_maintainer_insert" ON "canonical_show" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_show_canonical_maintainer_update" ON "canonical_show" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )) WITH CHECK (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "canonical_show_canonical_maintainer_delete" ON "canonical_show" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ));--> statement-breakpoint
CREATE POLICY "list_import_select_owner_or_admin" ON "list_import" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("list_import"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "list_import_insert_owner_or_admin" ON "list_import" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("list_import"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "list_import_update_owner_or_admin" ON "list_import" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("list_import"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("list_import"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "list_import_delete_owner_or_admin" ON "list_import" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("list_import"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "maintainer_notification_select_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "maintainer_notification_insert_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "maintainer_notification_update_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "maintainer_notification_delete_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "personal_episode_select_owner_or_admin" ON "personal_episode" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("personal_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "personal_episode_insert_owner_or_admin" ON "personal_episode" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("personal_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "personal_episode_update_owner_or_admin" ON "personal_episode" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("personal_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("personal_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "personal_episode_delete_owner_or_admin" ON "personal_episode" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("personal_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "personal_list_exclusion_select_owner_or_admin" ON "personal_list_exclusion" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("personal_list_exclusion"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_list_exclusion_insert_owner_or_admin" ON "personal_list_exclusion" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("personal_list_exclusion"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_list_exclusion_update_owner_or_admin" ON "personal_list_exclusion" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("personal_list_exclusion"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  )))) WITH CHECK ((("personal_list_exclusion"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_list_exclusion_delete_owner_or_admin" ON "personal_list_exclusion" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("personal_list_exclusion"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_season_select_owner_or_admin" ON "personal_season" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("personal_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_season_insert_owner_or_admin" ON "personal_season" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("personal_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_season_update_owner_or_admin" ON "personal_season" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("personal_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  )))) WITH CHECK ((("personal_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_season_delete_owner_or_admin" ON "personal_season" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("personal_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_show_select_owner_or_admin" ON "personal_show" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("personal_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_show_insert_owner_or_admin" ON "personal_show" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("personal_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_show_update_owner_or_admin" ON "personal_show" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("personal_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  )))) WITH CHECK ((("personal_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "personal_show_delete_owner_or_admin" ON "personal_show" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("personal_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'admin'
  ))));--> statement-breakpoint
CREATE POLICY "publish_application_select_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "publish_application_insert_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "publish_application_update_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "publish_application_delete_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_episode_public_read" ON "published_episode" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("publication_status" = 'published');--> statement-breakpoint
CREATE POLICY "published_episode_select_owner_or_admin" ON "published_episode" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("published_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_episode_insert_owner_or_admin" ON "published_episode" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("published_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_episode_update_owner_or_admin" ON "published_episode" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("published_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("published_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_episode_delete_owner_or_admin" ON "published_episode" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("published_episode"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_list_public_read" ON "published_list" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("publication_status" = 'published');--> statement-breakpoint
CREATE POLICY "published_list_select_owner_or_admin" ON "published_list" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("published_list"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_list_insert_owner_or_admin" ON "published_list" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("published_list"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_list_update_owner_or_admin" ON "published_list" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("published_list"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("published_list"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_list_delete_owner_or_admin" ON "published_list" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("published_list"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_season_public_read" ON "published_season" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("publication_status" = 'published');--> statement-breakpoint
CREATE POLICY "published_season_select_owner_or_admin" ON "published_season" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("published_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_season_insert_owner_or_admin" ON "published_season" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("published_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_season_update_owner_or_admin" ON "published_season" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("published_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("published_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_season_delete_owner_or_admin" ON "published_season" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("published_season"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_show_public_read" ON "published_show" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("publication_status" = 'published');--> statement-breakpoint
CREATE POLICY "published_show_select_owner_or_admin" ON "published_show" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("published_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_show_insert_owner_or_admin" ON "published_show" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("published_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_show_update_owner_or_admin" ON "published_show" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("published_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("published_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "published_show_delete_owner_or_admin" ON "published_show" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("published_show"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "user_profile_public_read" ON "user_profile" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("is_public" IS TRUE);--> statement-breakpoint
CREATE POLICY "user_profile_select_owner_or_admin" ON "user_profile" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((("user_profile"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "user_profile_insert_owner_or_admin" ON "user_profile" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((("user_profile"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "user_profile_update_owner_or_admin" ON "user_profile" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((("user_profile"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  )))) WITH CHECK ((("user_profile"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));--> statement-breakpoint
CREATE POLICY "user_profile_delete_owner_or_admin" ON "user_profile" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((("user_profile"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)) or (EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          coalesce(
            nullif(current_setting('request.jwt.claim', true), ''),
            nullif(current_setting('request.jwt.claims', true), '')
          )::jsonb -> 'app_metadata' -> 'roles'
        ),
        '[]'::jsonb
      )
    ) AS assigned_role(role_name_value)
    WHERE assigned_role.role_name_value = 'canonical_maintainer'
  ))));
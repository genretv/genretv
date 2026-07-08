CREATE TABLE "personal_season" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"canonical_show_id" uuid NOT NULL,
	"canonical_season_id" uuid NOT NULL,
	"section" varchar(24) NOT NULL,
	"season_label" varchar(80) NOT NULL,
	"timing" varchar(400) DEFAULT '' NOT NULL,
	"ended_reason" varchar(400) DEFAULT '' NOT NULL,
	"release_pattern" varchar(40),
	"episode_count" integer,
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_season" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_season_owner_canonical_season_unique" ON "personal_season" ("owner_id","canonical_season_id");--> statement-breakpoint
ALTER TABLE "personal_season" ADD CONSTRAINT "personal_season_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "personal_season" ADD CONSTRAINT "personal_season_canonical_season_id_canonical_season_id_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
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
  ))));
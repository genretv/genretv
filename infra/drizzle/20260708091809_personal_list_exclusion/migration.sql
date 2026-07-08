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
CREATE UNIQUE INDEX "personal_exclusion_owner_show_unique" ON "personal_list_exclusion" ("owner_id","canonical_show_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_exclusion_owner_season_unique" ON "personal_list_exclusion" ("owner_id","canonical_season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_exclusion_owner_episode_unique" ON "personal_list_exclusion" ("owner_id","canonical_episode_id");--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ADD CONSTRAINT "personal_list_exclusion_4RtAnh6OWmc8_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ADD CONSTRAINT "personal_list_exclusion_YaLsWMaIZ4BG_fkey" FOREIGN KEY ("canonical_season_id") REFERENCES "canonical_season"("id");--> statement-breakpoint
ALTER TABLE "personal_list_exclusion" ADD CONSTRAINT "personal_list_exclusion_iwwIDM5iS57m_fkey" FOREIGN KEY ("canonical_episode_id") REFERENCES "canonical_episode"("id");--> statement-breakpoint
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
  ))));
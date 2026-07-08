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
	"notes" varchar(8000),
	"created_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL,
	"updated_at_us" bigint DEFAULT public.pgxsinkit_clock_us() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_show" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_show_owner_canonical_show_unique" ON "personal_show" ("owner_id","canonical_show_id");--> statement-breakpoint
ALTER TABLE "personal_show" ADD CONSTRAINT "personal_show_canonical_show_id_canonical_show_id_fkey" FOREIGN KEY ("canonical_show_id") REFERENCES "canonical_show"("id");--> statement-breakpoint
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
  ))));
-- Custom workflow RLS hardening.
-- Raw SQL is intentionally confined to this custom Drizzle migration because
-- these policies need current_setting('request.jwt.claims') JSON extraction
-- and role-array expansion that Drizzle policy builders cannot express cleanly.
-- The schema keeps the generated owner-or-admin policy names, then this
-- migration narrows review/update/delete actions to canonical maintainers.
DROP POLICY "publish_application_select_owner_or_admin" ON "publish_application";--> statement-breakpoint
DROP POLICY "publish_application_insert_owner_or_admin" ON "publish_application";--> statement-breakpoint
DROP POLICY "publish_application_update_owner_or_admin" ON "publish_application";--> statement-breakpoint
DROP POLICY "publish_application_delete_owner_or_admin" ON "publish_application";--> statement-breakpoint
DROP POLICY "canonical_proposal_select_owner_or_admin" ON "canonical_proposal";--> statement-breakpoint
DROP POLICY "canonical_proposal_insert_owner_or_admin" ON "canonical_proposal";--> statement-breakpoint
DROP POLICY "canonical_proposal_update_owner_or_admin" ON "canonical_proposal";--> statement-breakpoint
DROP POLICY "canonical_proposal_delete_owner_or_admin" ON "canonical_proposal";--> statement-breakpoint
DROP POLICY "maintainer_notification_select_owner_or_admin" ON "maintainer_notification";--> statement-breakpoint
DROP POLICY "maintainer_notification_insert_owner_or_admin" ON "maintainer_notification";--> statement-breakpoint
DROP POLICY "maintainer_notification_update_owner_or_admin" ON "maintainer_notification";--> statement-breakpoint
DROP POLICY "maintainer_notification_delete_owner_or_admin" ON "maintainer_notification";--> statement-breakpoint

CREATE POLICY "publish_application_select_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
  "publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)
  OR EXISTS (
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
  )
);--> statement-breakpoint
CREATE POLICY "publish_application_insert_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
  "publish_application"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)
);--> statement-breakpoint
CREATE POLICY "publish_application_update_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
  EXISTS (
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
  )
) WITH CHECK (
  EXISTS (
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
  )
);--> statement-breakpoint
CREATE POLICY "publish_application_delete_owner_or_admin" ON "publish_application" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
  EXISTS (
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
  )
);--> statement-breakpoint

CREATE POLICY "canonical_proposal_select_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
  "canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)
  OR EXISTS (
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
  )
);--> statement-breakpoint
CREATE POLICY "canonical_proposal_insert_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
  "canonical_proposal"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)
);--> statement-breakpoint
CREATE POLICY "canonical_proposal_update_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
  EXISTS (
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
  )
) WITH CHECK (
  EXISTS (
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
  )
);--> statement-breakpoint
CREATE POLICY "canonical_proposal_delete_owner_or_admin" ON "canonical_proposal" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
  EXISTS (
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
  )
);--> statement-breakpoint

CREATE POLICY "maintainer_notification_select_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
  "maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)
  OR EXISTS (
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
  )
);--> statement-breakpoint
CREATE POLICY "maintainer_notification_insert_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
  "maintainer_notification"."owner_id" = (select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid)
);--> statement-breakpoint
CREATE POLICY "maintainer_notification_update_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
  EXISTS (
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
  )
) WITH CHECK (
  EXISTS (
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
  )
);--> statement-breakpoint
CREATE POLICY "maintainer_notification_delete_owner_or_admin" ON "maintainer_notification" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
  EXISTS (
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
  )
);

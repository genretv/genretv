-- Custom workflow notification fanout.
-- Raw SQL is intentionally confined to this custom Drizzle migration because
-- Drizzle cannot express PostgreSQL trigger functions or trigger bindings.
-- The initiating workflow rows still go through pgxsinkit pessimistic writes;
-- these triggers add sync-registry notification rows in the same transaction.
DROP TRIGGER IF EXISTS "publish_application_notify_maintainers_after_insert" ON "publish_application";--> statement-breakpoint
DROP TRIGGER IF EXISTS "canonical_proposal_notify_maintainers_after_insert" ON "canonical_proposal";--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."genretv_notify_publish_application_insert"();--> statement-breakpoint
DROP FUNCTION IF EXISTS "public"."genretv_notify_canonical_proposal_insert"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."genretv_notify_publish_application_insert"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_clock_us bigint;
BEGIN
  notification_clock_us := public.pgxsinkit_clock_us();

  INSERT INTO "maintainer_notification" (
    "id",
    "owner_id",
    "notification_kind",
    "status",
    "title",
    "body",
    "related_publish_application_id",
    "related_canonical_proposal_id",
    "created_at_us",
    "updated_at_us"
  )
  VALUES (
    gen_random_uuid(),
    NEW."owner_id",
    'publish_application',
    'unread',
    'Publisher application',
    NEW."message",
    NEW."id",
    NULL,
    notification_clock_us,
    notification_clock_us
  );

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."genretv_notify_publish_application_insert"() FROM PUBLIC;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."genretv_notify_canonical_proposal_insert"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_clock_us bigint;
BEGIN
  notification_clock_us := public.pgxsinkit_clock_us();

  INSERT INTO "maintainer_notification" (
    "id",
    "owner_id",
    "notification_kind",
    "status",
    "title",
    "body",
    "related_publish_application_id",
    "related_canonical_proposal_id",
    "created_at_us",
    "updated_at_us"
  )
  VALUES (
    gen_random_uuid(),
    NEW."owner_id",
    'canonical_proposal',
    'unread',
    'Canonical proposal: ' || NEW."title",
    NEW."message",
    NULL,
    NEW."id",
    notification_clock_us,
    notification_clock_us
  );

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."genretv_notify_canonical_proposal_insert"() FROM PUBLIC;--> statement-breakpoint

CREATE TRIGGER "publish_application_notify_maintainers_after_insert"
AFTER INSERT ON "publish_application"
FOR EACH ROW
EXECUTE FUNCTION "public"."genretv_notify_publish_application_insert"();--> statement-breakpoint

CREATE TRIGGER "canonical_proposal_notify_maintainers_after_insert"
AFTER INSERT ON "canonical_proposal"
FOR EACH ROW
EXECUTE FUNCTION "public"."genretv_notify_canonical_proposal_insert"();

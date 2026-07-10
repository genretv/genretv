-- Custom lifecycle ownership migration.
-- Raw SQL is intentionally confined to this custom Drizzle migration because the
-- cross-table DISTINCT ON backfill has no schema-level Drizzle representation.
-- Regex extraction is also intentionally tier 3: it upgrades existing user and
-- publication rows whose only structured season identity was the legacy label.
UPDATE "canonical_season"
SET "season_number" = substring(lower(trim("season_label")) FROM '^(?:s|season|series)\s*([0-9]+)')::integer
WHERE "season_number" IS NULL
  AND lower(trim("season_label")) ~ '^(?:s|season|series)\s*[0-9]+';--> statement-breakpoint

UPDATE "personal_season"
SET "season_number" = substring(lower(trim("season_label")) FROM '^(?:s|season|series)\s*([0-9]+)')::integer
WHERE "season_number" IS NULL
  AND lower(trim("season_label")) ~ '^(?:s|season|series)\s*[0-9]+';--> statement-breakpoint

UPDATE "published_season"
SET "season_number" = substring(lower(trim("season_label")) FROM '^(?:s|season|series)\s*([0-9]+)')::integer
WHERE "season_number" IS NULL
  AND lower(trim("season_label")) ~ '^(?:s|season|series)\s*[0-9]+';--> statement-breakpoint

UPDATE "canonical_season"
SET "release_kind" = CASE WHEN lower(trim("season_label")) LIKE 'movie%' THEN 'movie' ELSE 'special' END
WHERE lower(trim("season_label")) ~ '^(special|movie)';--> statement-breakpoint

UPDATE "personal_season"
SET "release_kind" = CASE WHEN lower(trim("season_label")) LIKE 'movie%' THEN 'movie' ELSE 'special' END
WHERE lower(trim("season_label")) ~ '^(special|movie)';--> statement-breakpoint

UPDATE "published_season"
SET "release_kind" = CASE WHEN lower(trim("season_label")) LIKE 'movie%' THEN 'movie' ELSE 'special' END
WHERE lower(trim("season_label")) ~ '^(special|movie)';--> statement-breakpoint

CREATE UNIQUE INDEX "canonical_season_show_kind_number_unique" ON "canonical_season" ("show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_season_owner_show_kind_number_unique" ON "personal_season" ("owner_id","personal_show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_season_owner_canonical_show_kind_number_unique" ON "personal_season" ("owner_id","canonical_show_id","release_kind","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "published_season_show_kind_number_unique" ON "published_season" ("published_list_id","published_show_id","release_kind","season_number");--> statement-breakpoint

WITH latest_terminal AS (
  SELECT DISTINCT ON ("show_id")
    "show_id",
    "ended_reason",
    CASE
      WHEN lower(trim("ended_reason")) LIKE 'canceled%'
        OR lower(trim("ended_reason")) LIKE 'cancelled%'
        THEN 'cancelled'
      ELSE 'ended'
    END AS "lifecycle_status"
  FROM "canonical_season"
  WHERE lower(trim("ended_reason")) LIKE 'canceled%'
    OR lower(trim("ended_reason")) LIKE 'cancelled%'
    OR (
      "section" = 'past'
      AND (
        lower(trim("ended_reason")) LIKE 'finished%'
        OR lower(trim("ended_reason")) LIKE 'ended%'
        OR lower(trim("ended_reason")) LIKE 'completed%'
        OR lower(trim("ended_reason")) LIKE 'final season%'
      )
    )
  ORDER BY "show_id", "source_row" DESC
)
UPDATE "canonical_show" AS target
SET
  "lifecycle_status" = latest_terminal."lifecycle_status",
  "ended_reason" = latest_terminal."ended_reason"
FROM latest_terminal
WHERE target."id" = latest_terminal."show_id";--> statement-breakpoint

WITH personal_terminal AS (
  SELECT DISTINCT ON (target."id")
    target."id" AS "show_id",
    source."ended_reason",
    CASE
      WHEN lower(trim(source."ended_reason")) LIKE 'canceled%'
        OR lower(trim(source."ended_reason")) LIKE 'cancelled%'
        THEN 'cancelled'
      ELSE 'ended'
    END AS "lifecycle_status"
  FROM "personal_show" AS target
  JOIN "personal_season" AS source
    ON source."owner_id" = target."owner_id"
    AND (
      source."personal_show_id" = target."id"
      OR (
        source."personal_show_id" IS NULL
        AND source."canonical_show_id" = target."canonical_show_id"
      )
    )
  WHERE lower(trim(source."ended_reason")) LIKE 'canceled%'
    OR lower(trim(source."ended_reason")) LIKE 'cancelled%'
    OR (
      source."section" = 'past'
      AND (
        lower(trim(source."ended_reason")) LIKE 'finished%'
        OR lower(trim(source."ended_reason")) LIKE 'ended%'
        OR lower(trim(source."ended_reason")) LIKE 'completed%'
        OR lower(trim(source."ended_reason")) LIKE 'final season%'
      )
    )
  ORDER BY target."id", source."source_row" DESC
)
UPDATE "personal_show" AS target
SET
  "lifecycle_status" = personal_terminal."lifecycle_status",
  "ended_reason" = personal_terminal."ended_reason"
FROM personal_terminal
WHERE target."id" = personal_terminal."show_id";--> statement-breakpoint

WITH published_terminal AS (
  SELECT DISTINCT ON ("published_show_id")
    "published_show_id",
    "ended_reason",
    CASE
      WHEN lower(trim("ended_reason")) LIKE 'canceled%'
        OR lower(trim("ended_reason")) LIKE 'cancelled%'
        THEN 'cancelled'
      ELSE 'ended'
    END AS "lifecycle_status"
  FROM "published_season"
  WHERE lower(trim("ended_reason")) LIKE 'canceled%'
    OR lower(trim("ended_reason")) LIKE 'cancelled%'
    OR (
      "section" = 'past'
      AND (
        lower(trim("ended_reason")) LIKE 'finished%'
        OR lower(trim("ended_reason")) LIKE 'ended%'
        OR lower(trim("ended_reason")) LIKE 'completed%'
        OR lower(trim("ended_reason")) LIKE 'final season%'
      )
    )
  ORDER BY "published_show_id", "source_row" DESC
)
UPDATE "published_show" AS target
SET
  "lifecycle_status" = published_terminal."lifecycle_status",
  "ended_reason" = published_terminal."ended_reason"
FROM published_terminal
WHERE target."id" = published_terminal."published_show_id";

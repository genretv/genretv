ALTER TABLE "published_season" ADD COLUMN "source_row" integer;
UPDATE "published_season" SET "source_row" = 0 WHERE "source_row" IS NULL;
ALTER TABLE "published_season" ALTER COLUMN "source_row" SET NOT NULL;

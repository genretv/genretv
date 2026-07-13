ALTER TABLE "canonical_proposal" ADD COLUMN "reviewed_payload" jsonb;--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD COLUMN "source_kind" varchar(64);--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD COLUMN "source_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD COLUMN "source_fingerprint" varchar(128);--> statement-breakpoint
ALTER TABLE "canonical_proposal" ADD COLUMN "source_observed_at_us" bigint;--> statement-breakpoint
CREATE UNIQUE INDEX "canonical_proposal_source_fingerprint_unique" ON "canonical_proposal" ("source_fingerprint");
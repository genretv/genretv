import { bigint, integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core";

import { clockMicrosecondsSql, defineSyncTable } from "@pgxsinkit/contracts";

export const canonicalShowSyncEntry = defineSyncTable({
  tableName: "canonical_show",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    displayTitle: varchar("display_title", { length: 300 }).notNull(),
    originalTitle: varchar("original_title", { length: 300 }),
    languages: jsonb("languages").notNull().default([]),
    countries: jsonb("countries").notNull().default([]),
    genreTags: jsonb("genre_tags").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  mode: "readonly",
});

export const canonicalSeasonSyncEntry = defineSyncTable({
  tableName: "canonical_season",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    showId: uuid("show_id")
      .notNull()
      .references(() => canonicalShowSyncEntry.table.id),
    section: varchar("section", { length: 24 }).notNull(),
    seasonLabel: varchar("season_label", { length: 80 }).notNull(),
    timing: varchar("timing", { length: 400 }).notNull().default(""),
    endedReason: varchar("ended_reason", { length: 400 }).notNull().default(""),
    releasePattern: varchar("release_pattern", { length: 40 }),
    releasePrecision: varchar("release_precision", { length: 40 }).notNull().default("unknown"),
    dateConfidence: varchar("date_confidence", { length: 40 }).notNull().default("unknown"),
    sortKey: varchar("sort_key", { length: 40 }),
    episodeCount: integer("episode_count"),
    organizations: jsonb("organizations").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  mode: "readonly",
  consistencyGroup: "canonical-schedule",
});

export const canonicalShowTable = canonicalShowSyncEntry.table;
export const canonicalSeasonTable = canonicalSeasonSyncEntry.table;

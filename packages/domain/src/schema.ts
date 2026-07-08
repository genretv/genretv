import { sql } from "drizzle-orm";
import { bigint, integer, jsonb, pgPolicy, uuid, varchar } from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";

import { clockMicrosecondsSql, defineSyncTable } from "@pgxsinkit/contracts";

const publicReadPolicy = (name: string) =>
  pgPolicy(name, {
    for: "select",
    to: [anonRole, authenticatedRole],
    using: sql`true`,
  });

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
  policies: [publicReadPolicy("canonical_show_public_read")],
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
    releaseWindow: jsonb("release_window"),
    finaleWindow: jsonb("finale_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    episodeCount: integer("episode_count"),
    sourceRow: integer("source_row").notNull(),
    organizations: jsonb("organizations").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  policies: [publicReadPolicy("canonical_season_public_read")],
  mode: "readonly",
  consistencyGroup: "canonical-schedule",
});

export const canonicalEpisodeSyncEntry = defineSyncTable({
  tableName: "canonical_episode",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => canonicalSeasonSyncEntry.table.id),
    episodeLabel: varchar("episode_label", { length: 80 }),
    title: varchar("title", { length: 300 }),
    releaseWindow: jsonb("release_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  policies: [publicReadPolicy("canonical_episode_public_read")],
  mode: "readonly",
  consistencyGroup: "canonical-schedule",
});

export const canonicalShowTable = canonicalShowSyncEntry.table;
export const canonicalSeasonTable = canonicalSeasonSyncEntry.table;
export const canonicalEpisodeTable = canonicalEpisodeSyncEntry.table;

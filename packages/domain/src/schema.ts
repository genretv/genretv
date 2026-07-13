import { sql, type AnyColumn } from "drizzle-orm";
import { bigint, boolean, integer, jsonb, pgPolicy, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";

import {
  buildSupabaseOwnerOrAdminNativePolicies,
  c,
  clockMicrosecondsSql,
  defineSyncTable,
  DENY_ALL,
  type JwtClaims,
} from "@pgxsinkit/contracts";

const publicReadPolicy = (name: string) =>
  pgPolicy(name, {
    for: "select",
    to: [anonRole, authenticatedRole],
    using: sql`true`,
  });

// Tier 3 is intentional here: Drizzle has no typed helper for testing Supabase custom roles inside
// `request.jwt.claims`; this mirrors pgxsinkit's owner-or-admin policy helper.
const canonicalMaintainerRolePredicate = sql`EXISTS (
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
  )`;

const canonicalMaintainerWritePolicies = (tableName: string) => [
  pgPolicy(`${tableName}_canonical_maintainer_insert`, {
    for: "insert",
    to: authenticatedRole,
    withCheck: canonicalMaintainerRolePredicate,
  }),
  pgPolicy(`${tableName}_canonical_maintainer_update`, {
    for: "update",
    to: authenticatedRole,
    using: canonicalMaintainerRolePredicate,
    withCheck: canonicalMaintainerRolePredicate,
  }),
  pgPolicy(`${tableName}_canonical_maintainer_delete`, {
    for: "delete",
    to: authenticatedRole,
    using: canonicalMaintainerRolePredicate,
  }),
];

function ownerReadFilter(columns: { ownerId: AnyColumn }) {
  return {
    customWhere: (claims: JwtClaims) => (claims.sub ? sql`${c(columns.ownerId)} = ${claims.sub}` : DENY_ALL),
    revision: "owner-v1",
  };
}

function hasRole(claims: JwtClaims, role: string): boolean {
  return claims.app_metadata?.roles?.includes(role) ?? false;
}

function ownerOrRoleReadFilter(columns: { ownerId: AnyColumn }, role: string, revision: string) {
  return {
    customWhere: (claims: JwtClaims) => {
      if (hasRole(claims, role)) return null;
      return claims.sub ? sql`${c(columns.ownerId)} = ${claims.sub}` : DENY_ALL;
    },
    revision,
  };
}

function publicOrOwnerPublishedReadFilter(
  columns: { ownerId: AnyColumn; publicationStatus: AnyColumn },
  revision: string,
) {
  return {
    customWhere: (claims: JwtClaims) => {
      if (hasRole(claims, "canonical_maintainer")) return null;
      if (claims.sub) {
        return sql`${c(columns.publicationStatus)} = ${"published"} OR ${c(columns.ownerId)} = ${claims.sub}`;
      }
      return sql`${c(columns.publicationStatus)} = ${"published"}`;
    },
    revision,
  };
}

function publicOrOwnerProfileReadFilter(columns: { ownerId: AnyColumn; isPublic: AnyColumn }, revision: string) {
  return {
    customWhere: (claims: JwtClaims) => {
      if (hasRole(claims, "canonical_maintainer")) return null;
      if (claims.sub) return sql`${c(columns.isPublic)} = ${true} OR ${c(columns.ownerId)} = ${claims.sub}`;
      return sql`${c(columns.isPublic)} = ${true}`;
    },
    revision,
  };
}

const publicPublishedReadPolicy = (name: string, publicationStatus: AnyColumn) =>
  pgPolicy(name, {
    for: "select",
    to: [anonRole, authenticatedRole],
    using: sql`${c(publicationStatus)} = 'published'`,
  });

const publicProfileReadPolicy = (name: string, isPublic: AnyColumn) =>
  pgPolicy(name, {
    for: "select",
    to: [anonRole, authenticatedRole],
    using: sql`${c(isPublic)} IS TRUE`,
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
    lifecycleStatus: varchar("lifecycle_status", { length: 24 }).notNull().default("open"),
    endedReason: varchar("ended_reason", { length: 400 }),
    notes: varchar("notes", { length: 8000 }),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  policies: [publicReadPolicy("canonical_show_public_read"), ...canonicalMaintainerWritePolicies("canonical_show")],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  consistencyGroup: "canonical-schedule",
  governance: {
    managedFields: [{ column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" }],
  },
});

export const canonicalSeasonSyncEntry = defineSyncTable({
  tableName: "canonical_season",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    showId: uuid("show_id")
      .notNull()
      .references(() => canonicalShowSyncEntry.table.id),
    section: varchar("section", { length: 24 }).notNull(),
    seasonNumber: integer("season_number"),
    seasonLabel: varchar("season_label", { length: 80 }),
    title: varchar("title", { length: 300 }),
    releaseKind: varchar("release_kind", { length: 24 }).notNull().default("season"),
    isFinal: boolean("is_final").notNull().default(false),
    timing: varchar("timing", { length: 400 }).notNull().default(""),
    releasePattern: varchar("release_pattern", { length: 40 }),
    releasePrecision: varchar("release_precision", { length: 40 }).notNull().default("unknown"),
    dateConfidence: varchar("date_confidence", { length: 40 }).notNull().default("unknown"),
    releaseWindow: jsonb("release_window"),
    finaleWindow: jsonb("finale_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    episodeCount: integer("episode_count"),
    organizations: jsonb("organizations").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    publicReadPolicy("canonical_season_public_read"),
    ...canonicalMaintainerWritePolicies("canonical_season"),
    uniqueIndex("canonical_season_show_kind_number_unique").on(self.showId, self.releaseKind, self.seasonNumber),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  consistencyGroup: "canonical-schedule",
  governance: {
    managedFields: [{ column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" }],
  },
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
  policies: [
    publicReadPolicy("canonical_episode_public_read"),
    ...canonicalMaintainerWritePolicies("canonical_episode"),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  consistencyGroup: "canonical-schedule",
  governance: {
    managedFields: [{ column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" }],
  },
});

export const personalShowSyncEntry = defineSyncTable({
  tableName: "personal_show",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    canonicalShowId: uuid("canonical_show_id").references(() => canonicalShowSyncEntry.table.id),
    displayTitle: varchar("display_title", { length: 300 }).notNull(),
    originalTitle: varchar("original_title", { length: 300 }),
    languages: jsonb("languages").notNull().default([]),
    countries: jsonb("countries").notNull().default([]),
    genreTags: jsonb("genre_tags").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    lifecycleStatus: varchar("lifecycle_status", { length: 24 }).notNull().default("open"),
    endedReason: varchar("ended_reason", { length: 400 }),
    notes: varchar("notes", { length: 8000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({ ownerColumn: self.ownerId, role: authenticatedRole }),
    uniqueIndex("personal_show_owner_canonical_show_unique").on(self.ownerId, self.canonicalShowId),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "personal-overlay",
  shape: {
    rowFilter: ownerReadFilter,
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const personalSeasonSyncEntry = defineSyncTable({
  tableName: "personal_season",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    personalShowId: uuid("personal_show_id").references(() => personalShowSyncEntry.table.id),
    canonicalShowId: uuid("canonical_show_id").references(() => canonicalShowSyncEntry.table.id),
    canonicalSeasonId: uuid("canonical_season_id").references(() => canonicalSeasonSyncEntry.table.id),
    section: varchar("section", { length: 24 }).notNull(),
    seasonNumber: integer("season_number"),
    seasonLabel: varchar("season_label", { length: 80 }),
    title: varchar("title", { length: 300 }),
    releaseKind: varchar("release_kind", { length: 24 }).notNull().default("season"),
    isFinal: boolean("is_final").notNull().default(false),
    timing: varchar("timing", { length: 400 }).notNull().default(""),
    releasePattern: varchar("release_pattern", { length: 40 }),
    releasePrecision: varchar("release_precision", { length: 40 }).notNull().default("unknown"),
    dateConfidence: varchar("date_confidence", { length: 40 }).notNull().default("unknown"),
    releaseWindow: jsonb("release_window"),
    finaleWindow: jsonb("finale_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    episodeCount: integer("episode_count"),
    organizations: jsonb("organizations").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({ ownerColumn: self.ownerId, role: authenticatedRole }),
    uniqueIndex("personal_season_owner_canonical_season_unique").on(self.ownerId, self.canonicalSeasonId),
    uniqueIndex("personal_season_owner_show_kind_number_unique").on(
      self.ownerId,
      self.personalShowId,
      self.releaseKind,
      self.seasonNumber,
    ),
    uniqueIndex("personal_season_owner_canonical_show_kind_number_unique").on(
      self.ownerId,
      self.canonicalShowId,
      self.releaseKind,
      self.seasonNumber,
    ),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "personal-overlay",
  shape: {
    rowFilter: ownerReadFilter,
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const personalEpisodeSyncEntry = defineSyncTable({
  tableName: "personal_episode",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    canonicalShowId: uuid("canonical_show_id").references(() => canonicalShowSyncEntry.table.id),
    canonicalSeasonId: uuid("canonical_season_id").references(() => canonicalSeasonSyncEntry.table.id),
    canonicalEpisodeId: uuid("canonical_episode_id").references(() => canonicalEpisodeSyncEntry.table.id),
    personalSeasonId: uuid("personal_season_id").references(() => personalSeasonSyncEntry.table.id),
    episodeLabel: varchar("episode_label", { length: 80 }),
    title: varchar("title", { length: 300 }),
    releaseWindow: jsonb("release_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
    uniqueIndex("personal_episode_owner_canonical_episode_unique").on(self.ownerId, self.canonicalEpisodeId),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "personal-overlay",
  shape: {
    rowFilter: ownerReadFilter,
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const personalListExclusionSyncEntry = defineSyncTable({
  tableName: "personal_list_exclusion",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    excludedKind: varchar("excluded_kind", { length: 32 }).notNull(),
    canonicalShowId: uuid("canonical_show_id").references(() => canonicalShowSyncEntry.table.id),
    canonicalSeasonId: uuid("canonical_season_id").references(() => canonicalSeasonSyncEntry.table.id),
    canonicalEpisodeId: uuid("canonical_episode_id").references(() => canonicalEpisodeSyncEntry.table.id),
    reason: varchar("reason", { length: 1000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({ ownerColumn: self.ownerId, role: authenticatedRole }),
    uniqueIndex("personal_exclusion_owner_show_unique").on(self.ownerId, self.canonicalShowId),
    uniqueIndex("personal_exclusion_owner_season_unique").on(self.ownerId, self.canonicalSeasonId),
    uniqueIndex("personal_exclusion_owner_episode_unique").on(self.ownerId, self.canonicalEpisodeId),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "personal-overlay",
  shape: {
    rowFilter: ownerReadFilter,
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const userProfileSyncEntry = defineSyncTable({
  tableName: "user_profile",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    publicSlug: varchar("public_slug", { length: 120 }),
    bio: varchar("bio", { length: 2000 }),
    isPublic: boolean("is_public").notNull().default(false),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    publicProfileReadPolicy("user_profile_public_read", self.isPublic),
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
    uniqueIndex("user_profile_owner_unique").on(self.ownerId),
    uniqueIndex("user_profile_public_slug_unique").on(self.publicSlug),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "user-workspace",
  shape: {
    rowFilter: (columns) => publicOrOwnerProfileReadFilter(columns, "user-profile-public-or-owner-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const publishedListSyncEntry = defineSyncTable({
  tableName: "published_list",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 4000 }),
    publicationStatus: varchar("publication_status", { length: 32 }).notNull().default("draft"),
    snapshotVersion: integer("snapshot_version").notNull().default(0),
    publishedAtUs: bigint("published_at_us", { mode: "bigint" }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    publicPublishedReadPolicy("published_list_public_read", self.publicationStatus),
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
    uniqueIndex("published_list_slug_unique").on(self.slug),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "publishing",
  shape: {
    rowFilter: (columns) => publicOrOwnerPublishedReadFilter(columns, "published-list-public-or-owner-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const publishedShowSyncEntry = defineSyncTable({
  tableName: "published_show",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    publishedListId: uuid("published_list_id")
      .notNull()
      .references(() => publishedListSyncEntry.table.id),
    snapshotVersion: integer("snapshot_version").notNull(),
    publicationStatus: varchar("publication_status", { length: 32 }).notNull().default("draft"),
    sourcePersonalShowId: uuid("source_personal_show_id").references(() => personalShowSyncEntry.table.id),
    canonicalShowId: uuid("canonical_show_id").references(() => canonicalShowSyncEntry.table.id),
    displayTitle: varchar("display_title", { length: 300 }).notNull(),
    originalTitle: varchar("original_title", { length: 300 }),
    languages: jsonb("languages").notNull().default([]),
    countries: jsonb("countries").notNull().default([]),
    genreTags: jsonb("genre_tags").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    lifecycleStatus: varchar("lifecycle_status", { length: 24 }).notNull().default("open"),
    endedReason: varchar("ended_reason", { length: 400 }),
    notes: varchar("notes", { length: 8000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    publicPublishedReadPolicy("published_show_public_read", self.publicationStatus),
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
    uniqueIndex("published_show_list_source_unique").on(self.publishedListId, self.sourcePersonalShowId),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "publishing",
  shape: {
    rowFilter: (columns) => publicOrOwnerPublishedReadFilter(columns, "published-show-public-or-owner-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const publishedSeasonSyncEntry = defineSyncTable({
  tableName: "published_season",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    publishedListId: uuid("published_list_id")
      .notNull()
      .references(() => publishedListSyncEntry.table.id),
    publishedShowId: uuid("published_show_id")
      .notNull()
      .references(() => publishedShowSyncEntry.table.id),
    snapshotVersion: integer("snapshot_version").notNull(),
    publicationStatus: varchar("publication_status", { length: 32 }).notNull().default("draft"),
    sourcePersonalSeasonId: uuid("source_personal_season_id").references(() => personalSeasonSyncEntry.table.id),
    canonicalSeasonId: uuid("canonical_season_id").references(() => canonicalSeasonSyncEntry.table.id),
    section: varchar("section", { length: 24 }).notNull(),
    seasonNumber: integer("season_number"),
    seasonLabel: varchar("season_label", { length: 80 }),
    title: varchar("title", { length: 300 }),
    releaseKind: varchar("release_kind", { length: 24 }).notNull().default("season"),
    isFinal: boolean("is_final").notNull().default(false),
    timing: varchar("timing", { length: 400 }).notNull().default(""),
    releasePattern: varchar("release_pattern", { length: 40 }),
    releasePrecision: varchar("release_precision", { length: 40 }).notNull().default("unknown"),
    dateConfidence: varchar("date_confidence", { length: 40 }).notNull().default("unknown"),
    releaseWindow: jsonb("release_window"),
    finaleWindow: jsonb("finale_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    episodeCount: integer("episode_count"),
    organizations: jsonb("organizations").notNull().default([]),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    publicPublishedReadPolicy("published_season_public_read", self.publicationStatus),
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
    uniqueIndex("published_season_list_source_unique").on(self.publishedListId, self.sourcePersonalSeasonId),
    uniqueIndex("published_season_show_kind_number_unique").on(
      self.publishedListId,
      self.publishedShowId,
      self.releaseKind,
      self.seasonNumber,
    ),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "publishing",
  shape: {
    rowFilter: (columns) => publicOrOwnerPublishedReadFilter(columns, "published-season-public-or-owner-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const publishedEpisodeSyncEntry = defineSyncTable({
  tableName: "published_episode",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    publishedListId: uuid("published_list_id")
      .notNull()
      .references(() => publishedListSyncEntry.table.id),
    publishedSeasonId: uuid("published_season_id")
      .notNull()
      .references(() => publishedSeasonSyncEntry.table.id),
    snapshotVersion: integer("snapshot_version").notNull(),
    publicationStatus: varchar("publication_status", { length: 32 }).notNull().default("draft"),
    sourcePersonalEpisodeId: uuid("source_personal_episode_id").references(() => personalEpisodeSyncEntry.table.id),
    canonicalEpisodeId: uuid("canonical_episode_id").references(() => canonicalEpisodeSyncEntry.table.id),
    episodeLabel: varchar("episode_label", { length: 80 }),
    title: varchar("title", { length: 300 }),
    releaseWindow: jsonb("release_window"),
    sortKey: varchar("sort_key", { length: 40 }),
    externalLinks: jsonb("external_links").notNull().default([]),
    notes: varchar("notes", { length: 8000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    publicPublishedReadPolicy("published_episode_public_read", self.publicationStatus),
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
    uniqueIndex("published_episode_list_source_unique").on(self.publishedListId, self.sourcePersonalEpisodeId),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "publishing",
  shape: {
    rowFilter: (columns) => publicOrOwnerPublishedReadFilter(columns, "published-episode-public-or-owner-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const listImportSyncEntry = defineSyncTable({
  tableName: "list_import",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    sourcePublishedListId: uuid("source_published_list_id")
      .notNull()
      .references(() => publishedListSyncEntry.table.id),
    sourcePublishedShowId: uuid("source_published_show_id").references(() => publishedShowSyncEntry.table.id),
    sourcePublishedSeasonId: uuid("source_published_season_id").references(() => publishedSeasonSyncEntry.table.id),
    sourcePublishedEpisodeId: uuid("source_published_episode_id").references(() => publishedEpisodeSyncEntry.table.id),
    targetPersonalShowId: uuid("target_personal_show_id").references(() => personalShowSyncEntry.table.id),
    targetPersonalSeasonId: uuid("target_personal_season_id").references(() => personalSeasonSyncEntry.table.id),
    targetPersonalEpisodeId: uuid("target_personal_episode_id").references(() => personalEpisodeSyncEntry.table.id),
    importMode: varchar("import_mode", { length: 32 }).notNull().default("linked"),
    importedKind: varchar("imported_kind", { length: 32 }).notNull().default("season"),
    notes: varchar("notes", { length: 4000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "publishing",
  shape: {
    rowFilter: ownerReadFilter,
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const publishApplicationSyncEntry = defineSyncTable({
  tableName: "publish_application",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    message: varchar("message", { length: 4000 }),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    reviewerId: uuid("reviewer_id"),
    reviewerNote: varchar("reviewer_note", { length: 4000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "maintainer-workflow",
  shape: {
    rowFilter: (columns) =>
      ownerOrRoleReadFilter(columns, "canonical_maintainer", "publish-application-owner-or-maintainer-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const canonicalProposalSyncEntry = defineSyncTable({
  tableName: "canonical_proposal",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    proposalKind: varchar("proposal_kind", { length: 32 }).notNull().default("season"),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    title: varchar("title", { length: 300 }).notNull(),
    message: varchar("message", { length: 4000 }),
    personalShowId: uuid("personal_show_id").references(() => personalShowSyncEntry.table.id),
    personalSeasonId: uuid("personal_season_id").references(() => personalSeasonSyncEntry.table.id),
    personalEpisodeId: uuid("personal_episode_id").references(() => personalEpisodeSyncEntry.table.id),
    canonicalShowId: uuid("canonical_show_id").references(() => canonicalShowSyncEntry.table.id),
    canonicalSeasonId: uuid("canonical_season_id").references(() => canonicalSeasonSyncEntry.table.id),
    canonicalEpisodeId: uuid("canonical_episode_id").references(() => canonicalEpisodeSyncEntry.table.id),
    proposedPayload: jsonb("proposed_payload").notNull().default({}),
    reviewedPayload: jsonb("reviewed_payload"),
    sourceKind: varchar("source_kind", { length: 64 }),
    sourceUrl: varchar("source_url", { length: 1000 }),
    sourceFingerprint: varchar("source_fingerprint", { length: 128 }),
    sourceObservedAtUs: bigint("source_observed_at_us", { mode: "bigint" }),
    reviewerId: uuid("reviewer_id"),
    reviewerNote: varchar("reviewer_note", { length: 4000 }),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    uniqueIndex("canonical_proposal_source_fingerprint_unique").on(self.sourceFingerprint),
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "maintainer-workflow",
  shape: {
    rowFilter: (columns) =>
      ownerOrRoleReadFilter(columns, "canonical_maintainer", "canonical-proposal-owner-or-maintainer-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const maintainerNotificationSyncEntry = defineSyncTable({
  tableName: "maintainer_notification",
  makeColumns: () => ({
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id").notNull(),
    notificationKind: varchar("notification_kind", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("unread"),
    title: varchar("title", { length: 240 }).notNull(),
    body: varchar("body", { length: 4000 }),
    relatedPublishApplicationId: uuid("related_publish_application_id").references(
      () => publishApplicationSyncEntry.table.id,
    ),
    relatedCanonicalProposalId: uuid("related_canonical_proposal_id").references(
      () => canonicalProposalSyncEntry.table.id,
    ),
    createdAtUs: bigint("created_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
    updatedAtUs: bigint("updated_at_us", { mode: "bigint" }).notNull().default(clockMicrosecondsSql),
  }),
  extras: (self) => [
    ...buildSupabaseOwnerOrAdminNativePolicies({
      ownerColumn: self.ownerId,
      role: authenticatedRole,
      adminRoleName: "canonical_maintainer",
    }),
  ],
  mode: "readwrite",
  conflictPolicy: "reject-if-stale",
  writeMode: "optimistic",
  subscription: "lazy",
  consistencyGroup: "maintainer-workflow",
  shape: {
    rowFilter: (columns) =>
      ownerOrRoleReadFilter(columns, "canonical_maintainer", "notification-owner-or-maintainer-v1"),
  },
  governance: {
    managedFields: [
      { column: "ownerId", applyOn: ["create"], strategy: "authClaim", claimPath: ["sub"] },
      { column: "createdAtUs", applyOn: ["create"], strategy: "nowMicroseconds" },
      { column: "updatedAtUs", applyOn: ["create", "update"], strategy: "nowMicroseconds" },
    ],
  },
});

export const canonicalShowTable = canonicalShowSyncEntry.table;
export const canonicalSeasonTable = canonicalSeasonSyncEntry.table;
export const canonicalEpisodeTable = canonicalEpisodeSyncEntry.table;
export const personalShowTable = personalShowSyncEntry.table;
export const personalSeasonTable = personalSeasonSyncEntry.table;
export const personalEpisodeTable = personalEpisodeSyncEntry.table;
export const personalListExclusionTable = personalListExclusionSyncEntry.table;
export const userProfileTable = userProfileSyncEntry.table;
export const publishedListTable = publishedListSyncEntry.table;
export const publishedShowTable = publishedShowSyncEntry.table;
export const publishedSeasonTable = publishedSeasonSyncEntry.table;
export const publishedEpisodeTable = publishedEpisodeSyncEntry.table;
export const listImportTable = listImportSyncEntry.table;
export const publishApplicationTable = publishApplicationSyncEntry.table;
export const canonicalProposalTable = canonicalProposalSyncEntry.table;
export const maintainerNotificationTable = maintainerNotificationSyncEntry.table;

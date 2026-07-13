import { createHash } from "node:crypto";

import type { CanonicalRegistrySeedRows, CanonicalSeasonSeedRow, CanonicalShowSeedRow } from "./canonical-seed";

export interface CanonicalShowSnapshot extends CanonicalShowSeedRow {}

export interface CanonicalSeasonSnapshot extends CanonicalSeasonSeedRow {}

export interface CanonicalProposalSource {
  kind: "blogspot";
  observedAtUs: bigint;
  url: string;
}

export interface BlogspotCanonicalProposal {
  canonicalEpisodeId: null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  fingerprint: string;
  message: string;
  proposalKind: "season" | "show";
  proposedPayload: Record<string, unknown>;
  source: CanonicalProposalSource;
  title: string;
}

export interface BlogspotProposalIssue {
  code: "ambiguous-show" | "ambiguous-season" | "deferred-season";
  detail: string;
  sourceId: string;
}

export interface BlogspotProposalPlan {
  issues: BlogspotProposalIssue[];
  proposals: BlogspotCanonicalProposal[];
  skippedDuplicateCount: number;
  unchangedShowCount: number;
  unchangedSeasonCount: number;
}

interface PlanBlogspotProposalOptions {
  canonical: {
    seasons: readonly CanonicalSeasonSnapshot[];
    shows: readonly CanonicalShowSnapshot[];
  };
  existingFingerprints?: ReadonlySet<string>;
  source: CanonicalProposalSource;
  sourceRows: CanonicalRegistrySeedRows;
}

const showFields = [
  "displayTitle",
  "originalTitle",
  "lifecycleStatus",
  "endedReason",
  "languages",
  "countries",
  "genreTags",
  "externalLinks",
  "notes",
] as const satisfies readonly (keyof CanonicalShowSeedRow)[];

const seasonFields = [
  "section",
  "seasonNumber",
  "seasonLabel",
  "title",
  "releaseKind",
  "isFinal",
  "timing",
  "releasePattern",
  "releasePrecision",
  "dateConfidence",
  "releaseWindow",
  "finaleWindow",
  "sortKey",
  "episodeCount",
  "organizations",
  "externalLinks",
  "notes",
] as const satisfies readonly (keyof CanonicalSeasonSeedRow)[];

export function planBlogspotCanonicalProposals(options: PlanBlogspotProposalOptions): BlogspotProposalPlan {
  const proposals: BlogspotCanonicalProposal[] = [];
  const issues: BlogspotProposalIssue[] = [];
  const existingFingerprints = options.existingFingerprints ?? new Set<string>();
  const sourceShowsById = new Map(options.sourceRows.shows.map((show) => [show.id, show]));
  const showMatches = matchShows(options.sourceRows.shows, options.canonical.shows);
  let skippedDuplicateCount = 0;
  let unchangedShowCount = 0;
  let unchangedSeasonCount = 0;

  for (const sourceShow of options.sourceRows.shows) {
    const match = showMatches.get(sourceShow.id);
    if (match?.kind === "ambiguous") {
      issues.push({
        code: "ambiguous-show",
        sourceId: sourceShow.id,
        detail: `${sourceShow.displayTitle} matches more than one canonical show`,
      });
      continue;
    }
    const canonicalShow = match?.kind === "matched" ? match.show : null;
    const proposedPayload = canonicalShow == null ? showCreatePayload(sourceShow) : showDiff(sourceShow, canonicalShow);
    if (canonicalShow != null && Object.keys(proposedPayload).length === 0) {
      unchangedShowCount += 1;
      continue;
    }
    const proposal = proposalFor({
      source: options.source,
      proposalKind: "show",
      sourceId: sourceShow.id,
      canonicalShowId: canonicalShow?.id ?? null,
      canonicalSeasonId: null,
      title: canonicalShow == null ? `Add ${sourceShow.displayTitle}` : `Update ${sourceShow.displayTitle}`,
      message: `Proposed from ${options.source.url}`,
      proposedPayload,
    });
    if (existingFingerprints.has(proposal.fingerprint)) skippedDuplicateCount += 1;
    else proposals.push(proposal);
  }

  for (const sourceSeason of options.sourceRows.seasons) {
    const sourceShow = sourceShowsById.get(sourceSeason.showId);
    if (sourceShow == null) continue;
    const showMatch = showMatches.get(sourceShow.id);
    if (showMatch?.kind !== "matched") {
      if (showMatch?.kind !== "ambiguous") {
        issues.push({
          code: "deferred-season",
          sourceId: sourceSeason.id,
          detail: `${sourceShow.displayTitle} must be accepted before its release rows can be proposed`,
        });
      }
      continue;
    }
    const candidates = options.canonical.seasons.filter((season) => season.showId === showMatch.show.id);
    const seasonMatch = matchSeason(sourceSeason, candidates);
    if (seasonMatch.kind === "ambiguous") {
      issues.push({
        code: "ambiguous-season",
        sourceId: sourceSeason.id,
        detail: `${sourceShow.displayTitle} ${seasonIdentity(sourceSeason)} matches more than one canonical release row`,
      });
      continue;
    }
    const canonicalSeason = seasonMatch.kind === "matched" ? seasonMatch.season : null;
    const proposedPayload =
      canonicalSeason == null ? seasonCreatePayload(sourceSeason) : seasonDiff(sourceSeason, canonicalSeason);
    if (canonicalSeason != null && Object.keys(proposedPayload).length === 0) {
      unchangedSeasonCount += 1;
      continue;
    }
    const proposal = proposalFor({
      source: options.source,
      proposalKind: "season",
      sourceId: sourceSeason.id,
      canonicalShowId: showMatch.show.id,
      canonicalSeasonId: canonicalSeason?.id ?? null,
      title: `${canonicalSeason == null ? "Add" : "Update"} ${sourceShow.displayTitle} ${seasonIdentity(sourceSeason)}`,
      message: `Proposed from ${options.source.url}`,
      proposedPayload,
    });
    if (existingFingerprints.has(proposal.fingerprint)) skippedDuplicateCount += 1;
    else proposals.push(proposal);
  }

  return { proposals, issues, skippedDuplicateCount, unchangedShowCount, unchangedSeasonCount };
}

type ShowMatch = { kind: "matched"; show: CanonicalShowSnapshot } | { kind: "ambiguous" } | { kind: "none" };

function matchShows(
  sourceShows: readonly CanonicalShowSeedRow[],
  canonicalShows: readonly CanonicalShowSnapshot[],
): Map<string, ShowMatch> {
  const result = new Map<string, ShowMatch>();
  const canonicalById = new Map(canonicalShows.map((show) => [show.id, show]));
  const canonicalByImdb = groupedBy(canonicalShows, imdbIdentity);
  const canonicalByTitle = groupedBy(canonicalShows, (show) => normalizeTitle(show.displayTitle));
  for (const source of sourceShows) {
    const byId = canonicalById.get(source.id);
    if (byId != null) {
      result.set(source.id, { kind: "matched", show: byId });
      continue;
    }
    const imdb = imdbIdentity(source);
    const candidates =
      imdb == null
        ? (canonicalByTitle.get(normalizeTitle(source.displayTitle)) ?? [])
        : (canonicalByImdb.get(imdb) ?? []);
    result.set(
      source.id,
      candidates.length === 1
        ? { kind: "matched", show: candidates[0]! }
        : candidates.length > 1
          ? { kind: "ambiguous" }
          : { kind: "none" },
    );
  }
  return result;
}

type SeasonMatch = { kind: "matched"; season: CanonicalSeasonSnapshot } | { kind: "ambiguous" } | { kind: "none" };

function matchSeason(source: CanonicalSeasonSeedRow, candidates: readonly CanonicalSeasonSnapshot[]): SeasonMatch {
  const byId = candidates.find((season) => season.id === source.id);
  if (byId != null) return { kind: "matched", season: byId };
  const matches = candidates.filter((candidate) => {
    if (candidate.releaseKind !== source.releaseKind) return false;
    if (source.releaseKind === "season" && source.seasonNumber != null) {
      return candidate.seasonNumber === source.seasonNumber;
    }
    const sourceLabel = normalizeTitle(source.seasonLabel ?? source.title ?? "");
    return sourceLabel !== "" && sourceLabel === normalizeTitle(candidate.seasonLabel ?? candidate.title ?? "");
  });
  if (matches.length === 1) return { kind: "matched", season: matches[0]! };
  return matches.length > 1 ? { kind: "ambiguous" } : { kind: "none" };
}

function showCreatePayload(show: CanonicalShowSeedRow): Record<string, unknown> {
  return { ...pick(show, showFields), createInitialSeason: false };
}

function seasonCreatePayload(season: CanonicalSeasonSeedRow): Record<string, unknown> {
  return pick(season, seasonFields);
}

function showDiff(source: CanonicalShowSeedRow, current: CanonicalShowSnapshot): Record<string, unknown> {
  return meaningfulDiff(source, current, showFields, new Set(["countries", "genreTags", "externalLinks", "notes"]));
}

function seasonDiff(source: CanonicalSeasonSeedRow, current: CanonicalSeasonSnapshot): Record<string, unknown> {
  return meaningfulDiff(
    source,
    current,
    seasonFields,
    new Set([
      "seasonLabel",
      "title",
      "timing",
      "releasePattern",
      "releaseWindow",
      "finaleWindow",
      "sortKey",
      "episodeCount",
      "organizations",
      "externalLinks",
      "notes",
    ]),
  );
}

function meaningfulDiff<T extends object>(
  source: T,
  current: T,
  fields: readonly (keyof T)[],
  preserveCurrentWhenSourceEmpty: ReadonlySet<keyof T>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    const sourceValue = source[field];
    if (preserveCurrentWhenSourceEmpty.has(field) && isEmpty(sourceValue)) continue;
    if (stableJson(sourceValue) !== stableJson(current[field])) patch[String(field)] = sourceValue;
  }
  return patch;
}

function proposalFor(input: {
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  message: string;
  proposalKind: "season" | "show";
  proposedPayload: Record<string, unknown>;
  source: CanonicalProposalSource;
  sourceId: string;
  title: string;
}): BlogspotCanonicalProposal {
  const fingerprintInput = {
    sourceKind: input.source.kind,
    sourceId: input.sourceId,
    canonicalShowId: input.canonicalShowId,
    canonicalSeasonId: input.canonicalSeasonId,
    proposalKind: input.proposalKind,
    proposedPayload: input.proposedPayload,
  };
  const digest = createHash("sha256").update(stableJson(fingerprintInput)).digest("hex");
  return {
    canonicalEpisodeId: null,
    canonicalSeasonId: input.canonicalSeasonId,
    canonicalShowId: input.canonicalShowId,
    fingerprint: `${input.sourceId}:${digest}`,
    message: input.message,
    proposalKind: input.proposalKind,
    proposedPayload: input.proposedPayload,
    source: input.source,
    title: input.title,
  };
}

function seasonIdentity(season: CanonicalSeasonSeedRow): string {
  if (season.releaseKind === "season" && season.seasonNumber != null) return `S${season.seasonNumber}`;
  return season.seasonLabel ?? season.title ?? season.releaseKind;
}

function imdbIdentity(show: Pick<CanonicalShowSeedRow, "externalLinks">): string | null {
  for (const link of show.externalLinks) {
    const match = /imdb\.com\/title\/(tt\d+)/i.exec(link.url);
    if (match?.[1] != null) return match[1].toLocaleLowerCase();
  }
  return null;
}

function groupedBy<T>(values: readonly T[], keyFor: (value: T) => string | null): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    if (key != null) groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}

function pick<T extends object>(value: T, fields: readonly (keyof T)[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function isEmpty(value: unknown): boolean {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (typeof value !== "object" || value == null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJson(item)]),
  );
}

import { useMemo } from "react";

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";

import { canonicalSchedule as fallbackSchedule } from "./canonical-schedule";
import {
  buildScheduleFromRegistryRows,
  type CanonicalEpisodeSeedRow,
  type CanonicalSchedule,
  type CanonicalSeasonSeedRow,
  type CanonicalShowSeedRow,
  type ExternalLinkSeed,
  type ReleaseWindowSeed,
  type ScheduleSection,
} from "./schedule";

const canonicalShow = genretvSyncRegistry.canonical_show.table;
const canonicalSeason = genretvSyncRegistry.canonical_season.table;
const canonicalEpisode = genretvSyncRegistry.canonical_episode.table;

export interface LiveCanonicalSchedule {
  error: Error | null;
  loading: boolean;
  schedule: CanonicalSchedule;
  usingFallback: boolean;
}

export function useCanonicalSchedule(): LiveCanonicalSchedule {
  const shows = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: canonicalShow.id,
          displayTitle: canonicalShow.displayTitle,
          originalTitle: canonicalShow.originalTitle,
          languages: canonicalShow.languages,
          countries: canonicalShow.countries,
          genreTags: canonicalShow.genreTags,
          externalLinks: canonicalShow.externalLinks,
          notes: canonicalShow.notes,
        })
        .from(canonicalShow),
    [],
  );
  const seasons = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: canonicalSeason.id,
          showId: canonicalSeason.showId,
          section: canonicalSeason.section,
          seasonLabel: canonicalSeason.seasonLabel,
          timing: canonicalSeason.timing,
          endedReason: canonicalSeason.endedReason,
          releasePattern: canonicalSeason.releasePattern,
          releasePrecision: canonicalSeason.releasePrecision,
          dateConfidence: canonicalSeason.dateConfidence,
          releaseWindow: canonicalSeason.releaseWindow,
          finaleWindow: canonicalSeason.finaleWindow,
          sortKey: canonicalSeason.sortKey,
          episodeCount: canonicalSeason.episodeCount,
          sourceRow: canonicalSeason.sourceRow,
          organizations: canonicalSeason.organizations,
          externalLinks: canonicalSeason.externalLinks,
          notes: canonicalSeason.notes,
        })
        .from(canonicalSeason),
    [],
  );
  const episodes = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: canonicalEpisode.id,
          seasonId: canonicalEpisode.seasonId,
          episodeLabel: canonicalEpisode.episodeLabel,
          title: canonicalEpisode.title,
          releaseWindow: canonicalEpisode.releaseWindow,
          sortKey: canonicalEpisode.sortKey,
          externalLinks: canonicalEpisode.externalLinks,
          notes: canonicalEpisode.notes,
        })
        .from(canonicalEpisode),
    [],
  );

  const usingFallback = shows.rows.length === 0 || seasons.rows.length === 0;
  const schedule = useMemo(() => {
    if (usingFallback) return fallbackSchedule;
    return buildScheduleFromRegistryRows(
      {
        shows: shows.rows.map(toCanonicalShowSeedRow),
        seasons: seasons.rows.map(toCanonicalSeasonSeedRow),
        episodes: episodes.rows.map(toCanonicalEpisodeSeedRow),
      },
      {
        title: fallbackSchedule.title,
        sourceUrl: fallbackSchedule.sourceUrl,
        updatedLabel: fallbackSchedule.updatedLabel,
        generatedAt: fallbackSchedule.generatedAt,
      },
    );
  }, [episodes.rows, seasons.rows, shows.rows, usingFallback]);

  return {
    schedule,
    usingFallback,
    loading: shows.loading || seasons.loading || episodes.loading,
    error: shows.error ?? seasons.error ?? episodes.error ?? null,
  };
}

function toCanonicalShowSeedRow(row: {
  countries: unknown;
  displayTitle: string;
  externalLinks: unknown;
  genreTags: unknown;
  id: string;
  languages: unknown;
  notes: string | null;
  originalTitle: string | null;
}): CanonicalShowSeedRow {
  return {
    id: row.id,
    displayTitle: row.displayTitle,
    originalTitle: row.originalTitle,
    languages: stringArray(row.languages),
    countries: stringArray(row.countries),
    genreTags: stringArray(row.genreTags),
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function toCanonicalSeasonSeedRow(row: {
  dateConfidence: string;
  endedReason: string;
  episodeCount: number | null;
  externalLinks: unknown;
  finaleWindow: unknown;
  id: string;
  notes: string | null;
  organizations: unknown;
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: unknown;
  seasonLabel: string;
  section: string;
  showId: string;
  sortKey: string | null;
  sourceRow: number;
  timing: string;
}): CanonicalSeasonSeedRow {
  return {
    id: row.id,
    showId: row.showId,
    section: scheduleSection(row.section),
    seasonLabel: row.seasonLabel,
    timing: row.timing,
    endedReason: row.endedReason,
    releasePattern: row.releasePattern,
    releasePrecision: row.releasePrecision,
    dateConfidence: row.dateConfidence,
    releaseWindow: releaseWindow(row.releaseWindow),
    finaleWindow: releaseWindow(row.finaleWindow),
    sortKey: row.sortKey,
    episodeCount: row.episodeCount,
    sourceRow: row.sourceRow,
    organizations: organizations(row.organizations),
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function toCanonicalEpisodeSeedRow(row: {
  episodeLabel: string | null;
  externalLinks: unknown;
  id: string;
  notes: string | null;
  releaseWindow: unknown;
  seasonId: string;
  sortKey: string | null;
  title: string | null;
}): CanonicalEpisodeSeedRow {
  return {
    id: row.id,
    seasonId: row.seasonId,
    episodeLabel: row.episodeLabel,
    title: row.title,
    releaseWindow: releaseWindow(row.releaseWindow),
    sortKey: row.sortKey,
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function externalLinks(value: unknown): ExternalLinkSeed[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ExternalLinkSeed[] => {
    if (!isRecord(item) || typeof item["url"] !== "string" || typeof item["label"] !== "string") return [];
    return [
      {
        label: item["label"],
        url: item["url"],
        ...(typeof item["kind"] === "string" ? { kind: item["kind"] } : {}),
      },
    ];
  });
}

function organizations(value: unknown): CanonicalSeasonSeedRow["organizations"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CanonicalSeasonSeedRow["organizations"] => {
    if (!isRecord(item) || typeof item["name"] !== "string" || typeof item["role"] !== "string") return [];
    return [{ name: item["name"], role: item["role"], externalLinks: externalLinks(item["externalLinks"]) }];
  });
}

function releaseWindow(value: unknown): ReleaseWindowSeed | null {
  if (!isRecord(value) || typeof value["raw"] !== "string") return null;
  return {
    raw: value["raw"],
    precision: typeof value["precision"] === "string" ? value["precision"] : "unknown",
    confidence: typeof value["confidence"] === "string" ? value["confidence"] : "unknown",
    year: typeof value["year"] === "number" ? value["year"] : null,
    month: typeof value["month"] === "number" ? value["month"] : null,
    day: typeof value["day"] === "number" ? value["day"] : null,
    releaseSeason: typeof value["releaseSeason"] === "string" ? value["releaseSeason"] : null,
  };
}

function scheduleSection(value: string): ScheduleSection {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

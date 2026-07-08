import type { CanonicalSchedule, ExternalLinkSeed, ReleaseWindowSeed, ScheduleEntry } from "../../domain/schedule";

export interface PublishedSnapshotPlanInput {
  description: string | null;
  listId: string;
  nowUs: bigint;
  slug: string;
  snapshotVersion: number;
  title: string;
}

export interface PublishedSnapshotPlan {
  episodes: PublishedEpisodeDraft[];
  list: PublishedListDraft;
  seasons: PublishedSeasonDraft[];
  shows: PublishedShowDraft[];
}

export interface PublishedListDraft {
  description: string | null;
  id: string;
  publicationStatus: "published";
  publishedAtUs: bigint;
  slug: string;
  snapshotVersion: number;
  title: string;
}

export interface PublishedShowDraft {
  canonicalShowId: null;
  displayTitle: string;
  externalLinks: ExternalLinkSeed[];
  genreTags: string[];
  id: string;
  languages: string[];
  countries: string[];
  notes: string | null;
  originalTitle: string | null;
  publicationStatus: "published";
  publishedListId: string;
  snapshotVersion: number;
  sourcePersonalShowId: null;
}

export interface PublishedSeasonDraft {
  canonicalSeasonId: null;
  dateConfidence: string;
  endedReason: string;
  episodeCount: number | null;
  externalLinks: ExternalLinkSeed[];
  finaleWindow: null;
  id: string;
  notes: string | null;
  organizations: Array<{ externalLinks: ExternalLinkSeed[]; name: string; role: string }>;
  publicationStatus: "published";
  publishedListId: string;
  publishedShowId: string;
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: null;
  seasonLabel: string;
  section: string;
  snapshotVersion: number;
  sortKey: string | null;
  sourcePersonalSeasonId: null;
  sourceRow: number;
  timing: string;
}

export interface PublishedEpisodeDraft {
  canonicalEpisodeId: null;
  episodeLabel: string | null;
  externalLinks: ExternalLinkSeed[];
  id: string;
  notes: string | null;
  publicationStatus: "published";
  publishedListId: string;
  publishedSeasonId: string;
  releaseWindow: ReleaseWindowSeed | null;
  snapshotVersion: number;
  sortKey: string | null;
  sourcePersonalEpisodeId: null;
  title: string | null;
}

export function buildPublishedSnapshotPlan(
  schedule: CanonicalSchedule,
  input: PublishedSnapshotPlanInput,
  newId: () => string,
): PublishedSnapshotPlan {
  const shows = new Map<string, PublishedShowDraft>();
  const showIds = new Map<string, string>();
  const seasons: PublishedSeasonDraft[] = [];
  const episodes: PublishedEpisodeDraft[] = [];

  for (const entry of schedule.entries) {
    const publishedShowId = showIds.get(entry.showId) ?? newId();
    if (!showIds.has(entry.showId)) {
      showIds.set(entry.showId, publishedShowId);
      shows.set(entry.showId, showDraft(entry, input, publishedShowId));
    }

    const publishedSeasonId = newId();
    seasons.push(seasonDraft(entry, input, publishedShowId, publishedSeasonId));
    for (const episode of entry.episodes) {
      episodes.push({
        id: newId(),
        publishedListId: input.listId,
        publishedSeasonId,
        snapshotVersion: input.snapshotVersion,
        publicationStatus: "published",
        sourcePersonalEpisodeId: null,
        canonicalEpisodeId: null,
        episodeLabel: episode.episodeLabel || null,
        title: episode.title || null,
        releaseWindow: releaseWindowFromDisplay(episode.releaseDate),
        sortKey: null,
        externalLinks: episode.links,
        notes: episode.notes,
      });
    }
  }

  return {
    list: {
      id: input.listId,
      slug: input.slug,
      title: input.title,
      description: input.description,
      publicationStatus: "published",
      snapshotVersion: input.snapshotVersion,
      publishedAtUs: input.nowUs,
    },
    shows: [...shows.values()],
    seasons,
    episodes,
  };
}

export function normalizePublishedSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function showDraft(entry: ScheduleEntry, input: PublishedSnapshotPlanInput, id: string): PublishedShowDraft {
  return {
    id,
    publishedListId: input.listId,
    snapshotVersion: input.snapshotVersion,
    publicationStatus: "published",
    sourcePersonalShowId: null,
    canonicalShowId: null,
    displayTitle: entry.title,
    originalTitle: entry.originalTitle,
    languages: entry.languages,
    countries: entry.countries,
    genreTags: entry.genres,
    externalLinks: entry.links,
    notes: entry.notes,
  };
}

function seasonDraft(
  entry: ScheduleEntry,
  input: PublishedSnapshotPlanInput,
  publishedShowId: string,
  id: string,
): PublishedSeasonDraft {
  return {
    id,
    publishedListId: input.listId,
    publishedShowId,
    snapshotVersion: input.snapshotVersion,
    publicationStatus: "published",
    sourcePersonalSeasonId: null,
    canonicalSeasonId: null,
    section: entry.section,
    seasonLabel: entry.seasonLabel,
    timing: entry.timing,
    endedReason: entry.endedReason,
    releasePattern: entry.releasePattern,
    releasePrecision: "unknown",
    dateConfidence: "unknown",
    releaseWindow: null,
    finaleWindow: null,
    sortKey: null,
    episodeCount: entry.episodeCount,
    sourceRow: entry.sourceRow,
    organizations: entry.organizations.map((name) => ({ name, role: "unknown", externalLinks: [] })),
    externalLinks: [],
    notes: entry.seasonNotes,
  };
}

function releaseWindowFromDisplay(raw: string): ReleaseWindowSeed | null {
  const text = raw.trim();
  if (text === "") return null;
  return {
    raw: text,
    precision: "unknown",
    confidence: "unknown",
    year: null,
    month: null,
    day: null,
    releaseSeason: null,
  };
}

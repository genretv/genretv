import type {
  CanonicalSchedule,
  ExternalLinkSeed,
  ReleaseWindowSeed,
  ScheduleEntry,
  ScheduleSection,
} from "../../domain/schedule";

export interface PublishedSnapshotPlanInput {
  description: string | null;
  listId: string;
  nowUs: bigint;
  slug: string;
  snapshotVersion: number;
  title: string;
}

export type PublishedSnapshotStatus = "draft" | "published";

export interface PublishedSnapshotPlanOptions {
  publicationStatus?: PublishedSnapshotStatus;
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
  publicationStatus: PublishedSnapshotStatus;
  publishedAtUs: bigint;
  slug: string;
  snapshotVersion: number;
  title: string;
}

export interface PublishedShowDraft {
  canonicalShowId: null;
  displayTitle: string;
  lifecycleStatus: string;
  endedReason: string | null;
  externalLinks: ExternalLinkSeed[];
  genreTags: string[];
  id: string;
  languages: string[];
  countries: string[];
  notes: string | null;
  originalTitle: string | null;
  publicationStatus: PublishedSnapshotStatus;
  publishedListId: string;
  snapshotVersion: number;
  sourcePersonalShowId: null;
}

export interface PublishedSeasonDraft {
  canonicalSeasonId: null;
  dateConfidence: string;
  episodeCount: number | null;
  externalLinks: ExternalLinkSeed[];
  finaleWindow: ReleaseWindowSeed | null;
  id: string;
  notes: string | null;
  organizations: Array<{ externalLinks: ExternalLinkSeed[]; name: string; role: string }>;
  publicationStatus: PublishedSnapshotStatus;
  publishedListId: string;
  publishedShowId: string;
  releaseKind: string;
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: ReleaseWindowSeed | null;
  seasonLabel: string | null;
  seasonNumber: number | null;
  title: string | null;
  isFinal: boolean;
  section: string;
  snapshotVersion: number;
  sortKey: string | null;
  sourcePersonalSeasonId: null;
  timing: string;
}

export interface PublishedEpisodeDraft {
  canonicalEpisodeId: null;
  episodeLabel: string | null;
  externalLinks: ExternalLinkSeed[];
  id: string;
  notes: string | null;
  publicationStatus: PublishedSnapshotStatus;
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
  options: PublishedSnapshotPlanOptions = {},
): PublishedSnapshotPlan {
  const shows = new Map<string, PublishedShowDraft>();
  const showIds = new Map<string, string>();
  const seasons: PublishedSeasonDraft[] = [];
  const episodes: PublishedEpisodeDraft[] = [];
  const publicationStatus = options.publicationStatus ?? "published";

  for (const entry of schedule.allEntries) {
    const publishedShowId = showIds.get(entry.showId) ?? newId();
    if (!showIds.has(entry.showId)) {
      showIds.set(entry.showId, publishedShowId);
      shows.set(entry.showId, showDraft(entry, input, publishedShowId, publicationStatus));
    }

    const publishedSeasonId = newId();
    seasons.push(seasonDraft(entry, input, publishedShowId, publishedSeasonId, publicationStatus));
    for (const episode of entry.episodes) {
      episodes.push({
        id: newId(),
        publishedListId: input.listId,
        publishedSeasonId,
        snapshotVersion: input.snapshotVersion,
        publicationStatus,
        sourcePersonalEpisodeId: null,
        canonicalEpisodeId: null,
        episodeLabel: episode.episodeLabel || null,
        title: episode.title || null,
        releaseWindow: episode.releaseWindow,
        sortKey: episode.sortKey,
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
      publicationStatus,
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

export function filteredPublishedSnapshotSchedule(schedule: CanonicalSchedule, query: string): CanonicalSchedule {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const allEntries =
    normalizedQuery === ""
      ? schedule.allEntries
      : schedule.allEntries.filter((entry) => publishedSnapshotEntryMatches(entry, normalizedQuery));
  const visibleIds = new Set(allEntries.map((entry) => entry.id));
  const entries = schedule.entries.filter((entry) => visibleIds.has(entry.id));
  return {
    ...schedule,
    entries,
    allEntries,
    counts: countBySection(entries),
  };
}

function showDraft(
  entry: ScheduleEntry,
  input: PublishedSnapshotPlanInput,
  id: string,
  publicationStatus: PublishedSnapshotStatus,
): PublishedShowDraft {
  return {
    id,
    publishedListId: input.listId,
    snapshotVersion: input.snapshotVersion,
    publicationStatus,
    sourcePersonalShowId: null,
    canonicalShowId: null,
    displayTitle: entry.title,
    originalTitle: entry.originalTitle,
    lifecycleStatus: entry.lifecycleStatus,
    endedReason: entry.endedReason,
    languages: entry.languages,
    countries: entry.countries,
    genreTags: entry.genres,
    externalLinks: entry.showLinks,
    notes: entry.notes,
  };
}

function seasonDraft(
  entry: ScheduleEntry,
  input: PublishedSnapshotPlanInput,
  publishedShowId: string,
  id: string,
  publicationStatus: PublishedSnapshotStatus,
): PublishedSeasonDraft {
  return {
    id,
    publishedListId: input.listId,
    publishedShowId,
    snapshotVersion: input.snapshotVersion,
    publicationStatus,
    sourcePersonalSeasonId: null,
    canonicalSeasonId: null,
    section: entry.sourceSection,
    seasonNumber: entry.seasonNumber,
    seasonLabel: entry.customSeasonLabel,
    title: entry.releaseTitle,
    releaseKind: entry.releaseKind,
    isFinal: entry.isFinal,
    timing: entry.timing,
    releasePattern: entry.releasePattern,
    releasePrecision: entry.releasePrecision,
    dateConfidence: entry.dateConfidence,
    releaseWindow: entry.releaseWindow,
    finaleWindow: entry.finaleWindow,
    sortKey: entry.sortKey,
    episodeCount: entry.episodeCount,
    organizations: entry.organizations.map((name) => ({ name, role: "unknown", externalLinks: [] })),
    externalLinks: entry.seasonLinks,
    notes: entry.seasonNotes,
  };
}

function publishedSnapshotEntryMatches(entry: ScheduleEntry, normalizedQuery: string): boolean {
  return [
    entry.title,
    entry.originalTitle ?? "",
    entry.seasonLabel,
    entry.organizationText,
    entry.genreText,
    entry.languages.join(" "),
    entry.countries.join(" "),
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function countBySection(entries: readonly ScheduleEntry[]): Record<ScheduleSection, number> {
  return {
    current: entries.filter((entry) => entry.section === "current").length,
    upcoming: entries.filter((entry) => entry.section === "upcoming").length,
    waiting: entries.filter((entry) => entry.section === "waiting").length,
    past: entries.filter((entry) => entry.section === "past").length,
  };
}

import type { CanonicalSeasonSeedRow, ExternalLinkSeed, ReleaseWindowSeed } from "../../domain/schedule";

export interface PublishedListRow {
  description: string | null;
  id: string;
  publicationStatus: string;
  slug: string;
  snapshotVersion: number;
  title: string;
  updatedAtUs: bigint;
}

export interface PublishedShowRow {
  countries: unknown;
  displayTitle: string;
  externalLinks: unknown;
  genreTags: unknown;
  id: string;
  languages: unknown;
  notes: string | null;
  originalTitle: string | null;
  publishedListId: string;
  snapshotVersion: number;
}

export interface PublishedSeasonRow {
  endedReason: string;
  episodeCount: number | null;
  id: string;
  notes: string | null;
  organizations: unknown;
  publishedListId: string;
  publishedShowId: string;
  dateConfidence: string;
  externalLinks: unknown;
  finaleWindow: unknown;
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: unknown;
  seasonLabel: string;
  section: string;
  snapshotVersion: number;
  sortKey: string | null;
  sourceRow: number;
  timing: string;
}

export interface PublishedEpisodeRow {
  canonicalEpisodeId: string | null;
  episodeLabel: string | null;
  externalLinks: unknown;
  id: string;
  notes: string | null;
  publishedListId: string;
  publishedSeasonId: string;
  releaseWindow: unknown;
  snapshotVersion: number;
  sortKey: string | null;
  title: string | null;
}

export interface ListImportRow {
  importMode: string;
  sourcePublishedSeasonId: string | null;
}

export interface PublishedListSummary {
  description: string | null;
  id: string;
  seasons: PublishedSeasonSummary[];
  slug: string;
  snapshotVersion: number;
  title: string;
  updatedAtUs: bigint;
}

export interface PublishedSeasonSummary {
  countries: string[];
  displayTitle: string;
  endedReason: string;
  episodeCount: number | null;
  episodes: PublishedEpisodeSummary[];
  externalLinks: ExternalLinkSeed[];
  genreTags: string[];
  id: string;
  importMode: string | null;
  languages: string[];
  notes: string | null;
  organizationText: string;
  organizationSeeds: CanonicalSeasonSeedRow["organizations"];
  organizations: string[];
  originalTitle: string | null;
  publishedListId: string;
  publishedShowId: string;
  dateConfidence: string;
  finaleWindow: ReleaseWindowSeed | null;
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: ReleaseWindowSeed | null;
  seasonLabel: string;
  seasonExternalLinks: ExternalLinkSeed[];
  section: string;
  showNotes: string | null;
  sortKey: string | null;
  sourceRow: number;
  timing: string;
}

export interface PublishedEpisodeSummary {
  canonicalEpisodeId: string | null;
  episodeLabel: string | null;
  externalLinks: ExternalLinkSeed[];
  id: string;
  notes: string | null;
  releaseWindow: ReleaseWindowSeed | null;
  sortKey: string | null;
  title: string | null;
}

export function buildPublishedListSummaries(
  lists: readonly PublishedListRow[],
  shows: readonly PublishedShowRow[],
  seasons: readonly PublishedSeasonRow[],
  episodes: readonly PublishedEpisodeRow[],
  imports: readonly ListImportRow[],
): PublishedListSummary[] {
  const importsBySeason = new Map(
    imports.flatMap((row) =>
      row.sourcePublishedSeasonId == null ? [] : [[row.sourcePublishedSeasonId, row.importMode]],
    ),
  );
  const showsByList = groupBy(shows, (show) => show.publishedListId);
  const seasonsByList = groupBy(seasons, (season) => season.publishedListId);
  const episodesBySeason = groupBy(episodes, (episode) => episode.publishedSeasonId);

  return lists
    .filter((list) => list.publicationStatus === "published")
    .map((list) => {
      const currentShows = new Map(
        (showsByList.get(list.id) ?? [])
          .filter((show) => show.snapshotVersion === list.snapshotVersion)
          .map((show) => [show.id, show]),
      );
      const currentSeasons = (seasonsByList.get(list.id) ?? []).filter(
        (season) => season.snapshotVersion === list.snapshotVersion,
      );
      return {
        id: list.id,
        slug: list.slug,
        title: list.title,
        description: list.description,
        snapshotVersion: list.snapshotVersion,
        updatedAtUs: list.updatedAtUs,
        seasons: currentSeasons
          .flatMap((season): PublishedSeasonSummary[] => {
            const show = currentShows.get(season.publishedShowId);
            if (show == null) return [];
            const organizationSeeds = organizations(season.organizations);
            return [
              {
                id: season.id,
                publishedListId: season.publishedListId,
                publishedShowId: season.publishedShowId,
                displayTitle: show.displayTitle,
                originalTitle: show.originalTitle,
                languages: stringArray(show.languages),
                countries: stringArray(show.countries),
                genreTags: stringArray(show.genreTags),
                externalLinks: externalLinks(show.externalLinks),
                notes: season.notes,
                showNotes: show.notes,
                seasonLabel: season.seasonLabel,
                section: season.section,
                timing: season.timing,
                endedReason: season.endedReason,
                releasePattern: season.releasePattern,
                releasePrecision: season.releasePrecision,
                dateConfidence: season.dateConfidence,
                releaseWindow: releaseWindow(season.releaseWindow),
                finaleWindow: releaseWindow(season.finaleWindow),
                episodeCount: season.episodeCount,
                episodes: (episodesBySeason.get(season.id) ?? [])
                  .filter((episode) => episode.snapshotVersion === list.snapshotVersion)
                  .map(toEpisodeSummary)
                  .sort(compareEpisodes),
                sortKey: season.sortKey,
                sourceRow: season.sourceRow,
                organizations: organizationSeeds.map((organization) => organization.name),
                organizationSeeds,
                organizationText: organizationSeeds.map((organization) => organization.name).join(", "),
                seasonExternalLinks: externalLinks(season.externalLinks),
                importMode: importsBySeason.get(season.id) ?? null,
              },
            ];
          })
          .sort((left, right) => left.sourceRow - right.sourceRow),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

function groupBy<T>(rows: readonly T[], keyFor: (row: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFor(row);
    result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toEpisodeSummary(episode: PublishedEpisodeRow): PublishedEpisodeSummary {
  return {
    id: episode.id,
    canonicalEpisodeId: episode.canonicalEpisodeId,
    episodeLabel: episode.episodeLabel,
    title: episode.title,
    releaseWindow: releaseWindow(episode.releaseWindow),
    sortKey: episode.sortKey,
    externalLinks: externalLinks(episode.externalLinks),
    notes: episode.notes,
  };
}

function compareEpisodes(left: PublishedEpisodeSummary, right: PublishedEpisodeSummary): number {
  return (
    (left.sortKey ?? "").localeCompare(right.sortKey ?? "") ||
    (left.episodeLabel ?? "").localeCompare(right.episodeLabel ?? "") ||
    left.id.localeCompare(right.id)
  );
}

function organizations(value: unknown): CanonicalSeasonSeedRow["organizations"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CanonicalSeasonSeedRow["organizations"] => {
    if (typeof item === "string") return [{ name: item, role: "unknown", externalLinks: [] }];
    if (!isRecord(item) || typeof item["name"] !== "string") return [];
    return [
      {
        name: item["name"],
        role: typeof item["role"] === "string" ? item["role"] : "unknown",
        externalLinks: externalLinks(item["externalLinks"]),
      },
    ];
  });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
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

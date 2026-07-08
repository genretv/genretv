import type { ExternalLinkSeed } from "../../domain/schedule";

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
  releasePattern: string | null;
  seasonLabel: string;
  section: string;
  snapshotVersion: number;
  sourceRow: number;
  timing: string;
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
  externalLinks: ExternalLinkSeed[];
  genreTags: string[];
  id: string;
  importMode: string | null;
  languages: string[];
  notes: string | null;
  organizationText: string;
  organizations: string[];
  originalTitle: string | null;
  publishedListId: string;
  publishedShowId: string;
  releasePattern: string | null;
  seasonLabel: string;
  section: string;
  showNotes: string | null;
  sourceRow: number;
  timing: string;
}

export function buildPublishedListSummaries(
  lists: readonly PublishedListRow[],
  shows: readonly PublishedShowRow[],
  seasons: readonly PublishedSeasonRow[],
  imports: readonly ListImportRow[],
): PublishedListSummary[] {
  const importsBySeason = new Map(
    imports.flatMap((row) =>
      row.sourcePublishedSeasonId == null ? [] : [[row.sourcePublishedSeasonId, row.importMode]],
    ),
  );
  const showsByList = groupBy(shows, (show) => show.publishedListId);
  const seasonsByList = groupBy(seasons, (season) => season.publishedListId);

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
                episodeCount: season.episodeCount,
                sourceRow: season.sourceRow,
                organizations: organizationNames(season.organizations),
                organizationText: organizationNames(season.organizations).join(", "),
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

function organizationNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    if (isRecord(item) && typeof item["name"] === "string") return [item["name"]];
    return [];
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

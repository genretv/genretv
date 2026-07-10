import type { CanonicalSeasonSeedRow, ExternalLinkSeed, ReleaseWindowSeed } from "../../domain/schedule";

export interface PublishedListRow {
  description: string | null;
  id: string;
  ownerId: string;
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
  lifecycleStatus: string;
  endedReason: string | null;
  notes: string | null;
  originalTitle: string | null;
  publishedListId: string;
  snapshotVersion: number;
}

export interface PublishedSeasonRow {
  episodeCount: number | null;
  id: string;
  notes: string | null;
  organizations: unknown;
  publishedListId: string;
  publishedShowId: string;
  dateConfidence: string;
  externalLinks: unknown;
  finaleWindow: unknown;
  isFinal: boolean;
  releaseKind: string;
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: unknown;
  seasonLabel: string | null;
  seasonNumber: number | null;
  title: string | null;
  section: string;
  snapshotVersion: number;
  sortKey: string | null;
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
  id: string;
  importMode: string;
  sourcePublishedSeasonId: string | null;
}

export interface UserProfileRow {
  displayName: string;
  ownerId: string;
  publicSlug: string | null;
}

export interface PublishedListSummary {
  description: string | null;
  id: string;
  ownerId: string;
  publisherDisplayName: string | null;
  publisherSlug: string | null;
  seasons: PublishedSeasonSummary[];
  slug: string;
  snapshotVersion: number;
  title: string;
  updatedAtUs: bigint;
}

export interface PublishedSeasonSummary {
  countries: string[];
  displayTitle: string;
  lifecycleStatus: string;
  endedReason: string | null;
  episodeCount: number | null;
  episodes: PublishedEpisodeSummary[];
  externalLinks: ExternalLinkSeed[];
  genreTags: string[];
  id: string;
  importId: string | null;
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
  releaseKind: string;
  releasePrecision: string;
  releaseWindow: ReleaseWindowSeed | null;
  seasonLabel: string;
  customSeasonLabel: string | null;
  seasonNumber: number | null;
  title: string | null;
  isFinal: boolean;
  seasonExternalLinks: ExternalLinkSeed[];
  section: string;
  showNotes: string | null;
  sortKey: string | null;
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
  profiles: readonly UserProfileRow[] = [],
): PublishedListSummary[] {
  const importsBySeason = new Map(
    imports.flatMap((row) =>
      row.sourcePublishedSeasonId == null ? [] : [[row.sourcePublishedSeasonId, { id: row.id, mode: row.importMode }]],
    ),
  );
  const showsByList = groupBy(shows, (show) => show.publishedListId);
  const seasonsByList = groupBy(seasons, (season) => season.publishedListId);
  const episodesBySeason = groupBy(episodes, (episode) => episode.publishedSeasonId);
  const profilesByOwner = new Map(profiles.map((profile) => [profile.ownerId, profile]));

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
        ownerId: list.ownerId,
        slug: list.slug,
        title: list.title,
        description: list.description,
        publisherDisplayName: profilesByOwner.get(list.ownerId)?.displayName ?? null,
        publisherSlug: profilesByOwner.get(list.ownerId)?.publicSlug ?? null,
        snapshotVersion: list.snapshotVersion,
        updatedAtUs: list.updatedAtUs,
        seasons: currentSeasons
          .flatMap((season): PublishedSeasonSummary[] => {
            const show = currentShows.get(season.publishedShowId);
            if (show == null) return [];
            const organizationSeeds = organizations(season.organizations);
            const importRow = importsBySeason.get(season.id) ?? null;
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
                lifecycleStatus: show.lifecycleStatus,
                endedReason: show.endedReason,
                seasonLabel: season.seasonLabel ?? season.title ?? releaseLabel(season),
                customSeasonLabel: season.seasonLabel,
                seasonNumber: season.seasonNumber,
                title: season.title,
                releaseKind: season.releaseKind,
                isFinal: season.isFinal,
                section: season.section,
                timing: season.timing,
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
                organizations: organizationSeeds.map((organization) => organization.name),
                organizationSeeds,
                organizationText: organizationSeeds.map((organization) => organization.name).join(", "),
                seasonExternalLinks: externalLinks(season.externalLinks),
                importId: importRow?.id ?? null,
                importMode: importRow?.mode ?? null,
              },
            ];
          })
          .sort(compareReleases),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

function releaseLabel(season: Pick<PublishedSeasonRow, "releaseKind" | "seasonNumber">): string {
  if (season.releaseKind === "season" && season.seasonNumber != null) return `S${season.seasonNumber}`;
  return season.releaseKind.charAt(0).toLocaleUpperCase() + season.releaseKind.slice(1);
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

function compareReleases(left: PublishedSeasonSummary, right: PublishedSeasonSummary): number {
  return (
    compareNullableStrings(left.sortKey, right.sortKey) ||
    (left.seasonNumber ?? Number.MAX_SAFE_INTEGER) - (right.seasonNumber ?? Number.MAX_SAFE_INTEGER) ||
    left.releaseKind.localeCompare(right.releaseKind) ||
    left.id.localeCompare(right.id)
  );
}

function compareNullableStrings(left: string | null, right: string | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left.localeCompare(right);
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

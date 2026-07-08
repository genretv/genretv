import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { useMemo } from "react";

import { useAuth } from "../auth/auth";
import {
  linkedPublishedEpisodeId,
  linkedPublishedSeasonId,
  linkedPublishedShowId,
} from "../features/publishing/linked-imports";
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
const personalShow = genretvSyncRegistry.personal_show.view!;
const personalSeason = genretvSyncRegistry.personal_season.view!;
const personalEpisode = genretvSyncRegistry.personal_episode.view!;
const personalListExclusion = genretvSyncRegistry.personal_list_exclusion.view!;
const publishedShow = genretvSyncRegistry.published_show.view!;
const publishedSeason = genretvSyncRegistry.published_season.view!;
const publishedEpisode = genretvSyncRegistry.published_episode.view!;
const listImport = genretvSyncRegistry.list_import.view!;

export interface LiveCanonicalSchedule {
  error: Error | null;
  loading: boolean;
  schedule: CanonicalSchedule;
  usingFallback: boolean;
}

export function useCanonicalSchedule(): LiveCanonicalSchedule {
  const { session } = useAuth();
  const personalReady = session != null;
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
  const personalShows = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: personalShow.id,
          canonicalShowId: personalShow.canonicalShowId,
          displayTitle: personalShow.displayTitle,
          originalTitle: personalShow.originalTitle,
          languages: personalShow.languages,
          countries: personalShow.countries,
          genreTags: personalShow.genreTags,
          externalLinks: personalShow.externalLinks,
          notes: personalShow.notes,
        })
        .from(personalShow),
    [],
    { ready: personalReady },
  );
  const personalSeasons = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: personalSeason.id,
          personalShowId: personalSeason.personalShowId,
          canonicalShowId: personalSeason.canonicalShowId,
          canonicalSeasonId: personalSeason.canonicalSeasonId,
          section: personalSeason.section,
          seasonLabel: personalSeason.seasonLabel,
          timing: personalSeason.timing,
          endedReason: personalSeason.endedReason,
          releasePattern: personalSeason.releasePattern,
          releasePrecision: personalSeason.releasePrecision,
          dateConfidence: personalSeason.dateConfidence,
          releaseWindow: personalSeason.releaseWindow,
          finaleWindow: personalSeason.finaleWindow,
          sortKey: personalSeason.sortKey,
          episodeCount: personalSeason.episodeCount,
          sourceRow: personalSeason.sourceRow,
          organizations: personalSeason.organizations,
          externalLinks: personalSeason.externalLinks,
          notes: personalSeason.notes,
        })
        .from(personalSeason),
    [],
    { ready: personalReady },
  );
  const personalEpisodes = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: personalEpisode.id,
          canonicalSeasonId: personalEpisode.canonicalSeasonId,
          personalSeasonId: personalEpisode.personalSeasonId,
          canonicalEpisodeId: personalEpisode.canonicalEpisodeId,
          episodeLabel: personalEpisode.episodeLabel,
          title: personalEpisode.title,
          releaseWindow: personalEpisode.releaseWindow,
          sortKey: personalEpisode.sortKey,
          externalLinks: personalEpisode.externalLinks,
          notes: personalEpisode.notes,
        })
        .from(personalEpisode),
    [],
    { ready: personalReady },
  );
  const personalExclusions = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          excludedKind: personalListExclusion.excludedKind,
          canonicalShowId: personalListExclusion.canonicalShowId,
          canonicalSeasonId: personalListExclusion.canonicalSeasonId,
          canonicalEpisodeId: personalListExclusion.canonicalEpisodeId,
        })
        .from(personalListExclusion),
    [],
    { ready: personalReady },
  );
  const listImports = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          importMode: listImport.importMode,
          importedKind: listImport.importedKind,
          sourcePublishedShowId: listImport.sourcePublishedShowId,
          sourcePublishedSeasonId: listImport.sourcePublishedSeasonId,
          sourcePublishedEpisodeId: listImport.sourcePublishedEpisodeId,
        })
        .from(listImport),
    [],
    { ready: personalReady },
  );
  const publishedShows = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: publishedShow.id,
          publicationStatus: publishedShow.publicationStatus,
          displayTitle: publishedShow.displayTitle,
          originalTitle: publishedShow.originalTitle,
          languages: publishedShow.languages,
          countries: publishedShow.countries,
          genreTags: publishedShow.genreTags,
          externalLinks: publishedShow.externalLinks,
          notes: publishedShow.notes,
        })
        .from(publishedShow),
    [],
    { ready: personalReady },
  );
  const publishedSeasons = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: publishedSeason.id,
          publicationStatus: publishedSeason.publicationStatus,
          publishedShowId: publishedSeason.publishedShowId,
          section: publishedSeason.section,
          seasonLabel: publishedSeason.seasonLabel,
          timing: publishedSeason.timing,
          endedReason: publishedSeason.endedReason,
          releasePattern: publishedSeason.releasePattern,
          releasePrecision: publishedSeason.releasePrecision,
          dateConfidence: publishedSeason.dateConfidence,
          releaseWindow: publishedSeason.releaseWindow,
          finaleWindow: publishedSeason.finaleWindow,
          sortKey: publishedSeason.sortKey,
          episodeCount: publishedSeason.episodeCount,
          sourceRow: publishedSeason.sourceRow,
          organizations: publishedSeason.organizations,
          externalLinks: publishedSeason.externalLinks,
          notes: publishedSeason.notes,
        })
        .from(publishedSeason),
    [],
    { ready: personalReady },
  );
  const publishedEpisodes = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: publishedEpisode.id,
          publicationStatus: publishedEpisode.publicationStatus,
          publishedSeasonId: publishedEpisode.publishedSeasonId,
          episodeLabel: publishedEpisode.episodeLabel,
          title: publishedEpisode.title,
          releaseWindow: publishedEpisode.releaseWindow,
          sortKey: publishedEpisode.sortKey,
          externalLinks: publishedEpisode.externalLinks,
          notes: publishedEpisode.notes,
        })
        .from(publishedEpisode),
    [],
    { ready: personalReady },
  );

  const usingFallback = shows.rows.length === 0 || seasons.rows.length === 0;
  const schedule = useMemo(() => {
    if (usingFallback) return fallbackSchedule;
    const canonicalRows = applyPersonalExclusions(
      {
        shows: shows.rows.map(toCanonicalShowSeedRow),
        seasons: seasons.rows.map(toCanonicalSeasonSeedRow),
        episodes: episodes.rows.map(toCanonicalEpisodeSeedRow),
      },
      personalReady ? personalExclusions.rows : [],
    );
    const personalRows = {
      shows: applyPersonalShows(canonicalRows.shows, personalReady ? personalShows.rows : []),
      seasons: applyPersonalSeasons(canonicalRows.seasons, personalReady ? personalSeasons.rows : []),
      episodes: applyPersonalEpisodes(canonicalRows.episodes, personalReady ? personalEpisodes.rows : []),
    };
    const linkedRows = applyLinkedPublishedImports(
      personalRows,
      personalReady ? listImports.rows : [],
      personalReady
        ? {
            shows: publishedShows.rows,
            seasons: publishedSeasons.rows,
            episodes: publishedEpisodes.rows,
          }
        : { shows: [], seasons: [], episodes: [] },
    );
    return buildScheduleFromRegistryRows(
      {
        shows: linkedRows.shows,
        seasons: linkedRows.seasons,
        episodes: linkedRows.episodes,
      },
      {
        title: fallbackSchedule.title,
        sourceUrl: fallbackSchedule.sourceUrl,
        updatedLabel: fallbackSchedule.updatedLabel,
        generatedAt: fallbackSchedule.generatedAt,
      },
    );
  }, [
    episodes.rows,
    personalExclusions.rows,
    personalEpisodes.rows,
    personalReady,
    personalSeasons.rows,
    personalShows.rows,
    listImports.rows,
    publishedEpisodes.rows,
    publishedSeasons.rows,
    publishedShows.rows,
    seasons.rows,
    shows.rows,
    usingFallback,
  ]);

  return {
    schedule,
    usingFallback,
    loading:
      shows.loading ||
      seasons.loading ||
      episodes.loading ||
      (personalReady &&
        (personalShows.loading ||
          personalSeasons.loading ||
          personalEpisodes.loading ||
          personalExclusions.loading ||
          listImports.loading ||
          publishedShows.loading ||
          publishedSeasons.loading ||
          publishedEpisodes.loading)),
    error:
      shows.error ??
      seasons.error ??
      episodes.error ??
      (personalReady
        ? (personalShows.error ??
          personalSeasons.error ??
          personalEpisodes.error ??
          personalExclusions.error ??
          listImports.error ??
          publishedShows.error ??
          publishedSeasons.error ??
          publishedEpisodes.error)
        : null),
  };
}

export interface PersonalExclusionRow {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  excludedKind: string;
}

export function applyPersonalExclusions(
  canonicalRows: {
    episodes: CanonicalEpisodeSeedRow[];
    seasons: CanonicalSeasonSeedRow[];
    shows: CanonicalShowSeedRow[];
  },
  exclusions: readonly PersonalExclusionRow[],
): {
  episodes: CanonicalEpisodeSeedRow[];
  seasons: CanonicalSeasonSeedRow[];
  shows: CanonicalShowSeedRow[];
} {
  const hiddenShowIds = new Set(
    exclusions.flatMap((row) =>
      row.excludedKind === "show" && row.canonicalShowId != null ? [row.canonicalShowId] : [],
    ),
  );
  const hiddenSeasonIds = new Set(
    exclusions.flatMap((row) =>
      row.excludedKind === "season" && row.canonicalSeasonId != null ? [row.canonicalSeasonId] : [],
    ),
  );
  const hiddenEpisodeIds = new Set(
    exclusions.flatMap((row) =>
      row.excludedKind === "episode" && row.canonicalEpisodeId != null ? [row.canonicalEpisodeId] : [],
    ),
  );
  const shows = canonicalRows.shows.filter((show) => !hiddenShowIds.has(show.id));
  const seasons = canonicalRows.seasons.filter(
    (season) => !hiddenSeasonIds.has(season.id) && !hiddenShowIds.has(season.showId),
  );
  const visibleSeasonIds = new Set(seasons.map((season) => season.id));
  const episodes = canonicalRows.episodes.filter(
    (episode) => visibleSeasonIds.has(episode.seasonId) && !hiddenEpisodeIds.has(episode.id),
  );
  return { shows, seasons, episodes };
}

function applyPersonalShows(
  canonicalRows: CanonicalShowSeedRow[],
  personalRows: ReadonlyArray<{
    canonicalShowId: string | null;
    countries: unknown;
    displayTitle: string;
    externalLinks: unknown;
    genreTags: unknown;
    id: string;
    languages: unknown;
    notes: string | null;
    originalTitle: string | null;
  }>,
): CanonicalShowSeedRow[] {
  const overlays = new Map(
    personalRows.flatMap((row) => (row.canonicalShowId == null ? [] : [[row.canonicalShowId, row]])),
  );
  const additions = personalRows.flatMap((row) => (row.canonicalShowId == null ? [personalShowToSeedRow(row)] : []));
  return [
    ...canonicalRows.map((row) => {
      const overlay = overlays.get(row.id);
      return overlay == null ? row : personalShowToSeedRow(overlay, row.id);
    }),
    ...additions,
  ];
}

export function applyPersonalSeasons(
  canonicalRows: CanonicalSeasonSeedRow[],
  personalRows: ReadonlyArray<{
    canonicalSeasonId: string | null;
    canonicalShowId: string | null;
    endedReason: string;
    episodeCount: number | null;
    id: string;
    notes: string | null;
    organizations: unknown;
    personalShowId: string | null;
    externalLinks: unknown;
    dateConfidence: string;
    releasePattern: string | null;
    releasePrecision: string;
    releaseWindow: unknown;
    seasonLabel: string;
    section: string;
    finaleWindow: unknown;
    sortKey: string | null;
    sourceRow: number;
    timing: string;
  }>,
): CanonicalSeasonSeedRow[] {
  const overlays = new Map(
    personalRows.flatMap((row) => (row.canonicalSeasonId == null ? [] : [[row.canonicalSeasonId, row]])),
  );
  const additions = personalRows.flatMap((row, index) => {
    if (row.canonicalSeasonId != null) return [];
    const showId = row.personalShowId ?? row.canonicalShowId;
    return showId == null ? [] : [personalSeasonToSeedRow(row, showId, index)];
  });
  return [
    ...canonicalRows.map((row) => {
      const overlay = overlays.get(row.id);
      return overlay == null
        ? row
        : {
            ...row,
            section: scheduleSection(overlay.section),
            seasonLabel: overlay.seasonLabel,
            timing: overlay.timing,
            endedReason: overlay.endedReason,
            releasePattern: overlay.releasePattern,
            releasePrecision: overlay.releasePrecision,
            dateConfidence: overlay.dateConfidence,
            releaseWindow: releaseWindow(overlay.releaseWindow),
            finaleWindow: releaseWindow(overlay.finaleWindow),
            sortKey: overlay.sortKey,
            episodeCount: overlay.episodeCount,
            sourceRow: overlay.sourceRow,
            organizations: organizations(overlay.organizations),
            externalLinks: externalLinks(overlay.externalLinks),
            notes: overlay.notes,
          };
    }),
    ...additions,
  ];
}

export function applyPersonalEpisodes(
  canonicalRows: CanonicalEpisodeSeedRow[],
  personalRows: ReadonlyArray<{
    canonicalEpisodeId: string | null;
    canonicalSeasonId: string | null;
    personalSeasonId: string | null;
    episodeLabel: string | null;
    externalLinks: unknown;
    id: string;
    notes: string | null;
    releaseWindow: unknown;
    sortKey: string | null;
    title: string | null;
  }>,
): CanonicalEpisodeSeedRow[] {
  const overlays = new Map(
    personalRows.flatMap((row) => (row.canonicalEpisodeId == null ? [] : [[row.canonicalEpisodeId, row]])),
  );
  const additions = personalRows.flatMap((row) => {
    if (row.canonicalEpisodeId != null) return [];
    const seasonId = row.personalSeasonId ?? row.canonicalSeasonId;
    return seasonId == null ? [] : [personalEpisodeToSeedRow(row, seasonId)];
  });
  return [
    ...canonicalRows.map((row) => {
      const overlay = overlays.get(row.id);
      return overlay == null ? row : personalEpisodeToSeedRow(overlay, row.seasonId, row.id);
    }),
    ...additions,
  ];
}

export interface LinkedPublishedImportRow {
  importedKind: string;
  importMode: string;
  sourcePublishedEpisodeId: string | null;
  sourcePublishedSeasonId: string | null;
  sourcePublishedShowId: string | null;
}

export function applyLinkedPublishedImports(
  currentRows: {
    episodes: CanonicalEpisodeSeedRow[];
    seasons: CanonicalSeasonSeedRow[];
    shows: CanonicalShowSeedRow[];
  },
  imports: readonly LinkedPublishedImportRow[],
  publishedRows: {
    episodes: ReadonlyArray<{
      episodeLabel: string | null;
      externalLinks: unknown;
      id: string;
      notes: string | null;
      publicationStatus: string;
      publishedSeasonId: string;
      releaseWindow: unknown;
      sortKey: string | null;
      title: string | null;
    }>;
    seasons: ReadonlyArray<{
      dateConfidence: string;
      endedReason: string;
      episodeCount: number | null;
      externalLinks: unknown;
      finaleWindow: unknown;
      id: string;
      notes: string | null;
      organizations: unknown;
      publicationStatus: string;
      publishedShowId: string;
      releasePattern: string | null;
      releasePrecision: string;
      releaseWindow: unknown;
      seasonLabel: string;
      section: string;
      sortKey: string | null;
      sourceRow: number;
      timing: string;
    }>;
    shows: ReadonlyArray<{
      countries: unknown;
      displayTitle: string;
      externalLinks: unknown;
      genreTags: unknown;
      id: string;
      languages: unknown;
      notes: string | null;
      originalTitle: string | null;
      publicationStatus: string;
    }>;
  },
): {
  episodes: CanonicalEpisodeSeedRow[];
  seasons: CanonicalSeasonSeedRow[];
  shows: CanonicalShowSeedRow[];
} {
  const linkedSeasonIds = unique(
    imports.flatMap((row) =>
      row.importMode === "linked" && row.sourcePublishedSeasonId != null ? [row.sourcePublishedSeasonId] : [],
    ),
  );
  if (linkedSeasonIds.length === 0) return currentRows;

  const publishedShowsById = new Map(
    publishedRows.shows.filter((show) => show.publicationStatus === "published").map((show) => [show.id, show]),
  );
  const publishedSeasonsById = new Map(
    publishedRows.seasons
      .filter((season) => season.publicationStatus === "published")
      .map((season) => [season.id, season]),
  );
  const publishedEpisodesBySeason = groupBy(
    publishedRows.episodes.filter((episode) => episode.publicationStatus === "published"),
    (episode) => episode.publishedSeasonId,
  );
  const shows = [...currentRows.shows];
  const seasons = [...currentRows.seasons];
  const episodes = [...currentRows.episodes];
  const localShowIds = new Set(shows.map((show) => show.id));
  const localSeasonIds = new Set(seasons.map((season) => season.id));
  const localEpisodeIds = new Set(episodes.map((episode) => episode.id));

  for (const sourceSeasonId of linkedSeasonIds) {
    const sourceSeason = publishedSeasonsById.get(sourceSeasonId);
    if (sourceSeason == null) continue;
    const sourceShow = publishedShowsById.get(sourceSeason.publishedShowId);
    if (sourceShow == null) continue;

    const localShowId = linkedPublishedShowId(sourceShow.id);
    const localSeasonId = linkedPublishedSeasonId(sourceSeason.id);
    if (!localShowIds.has(localShowId)) {
      shows.push(publishedShowToSeedRow(sourceShow, localShowId));
      localShowIds.add(localShowId);
    }
    if (!localSeasonIds.has(localSeasonId)) {
      seasons.push(publishedSeasonToSeedRow(sourceSeason, localShowId, localSeasonId));
      localSeasonIds.add(localSeasonId);
    }
    for (const sourceEpisode of publishedEpisodesBySeason.get(sourceSeason.id) ?? []) {
      const localEpisodeId = linkedPublishedEpisodeId(sourceEpisode.id);
      if (!localEpisodeIds.has(localEpisodeId)) {
        episodes.push(publishedEpisodeToSeedRow(sourceEpisode, localSeasonId, localEpisodeId));
        localEpisodeIds.add(localEpisodeId);
      }
    }
  }

  return { shows, seasons, episodes };
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

function personalShowToSeedRow(
  row: {
    countries: unknown;
    displayTitle: string;
    externalLinks: unknown;
    genreTags: unknown;
    id: string;
    languages: unknown;
    notes: string | null;
    originalTitle: string | null;
  },
  id = row.id,
): CanonicalShowSeedRow {
  return {
    id,
    displayTitle: row.displayTitle,
    originalTitle: row.originalTitle,
    languages: stringArray(row.languages),
    countries: stringArray(row.countries),
    genreTags: stringArray(row.genreTags),
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function personalSeasonToSeedRow(
  row: {
    endedReason: string;
    episodeCount: number | null;
    externalLinks: unknown;
    dateConfidence: string;
    finaleWindow: unknown;
    id: string;
    notes: string | null;
    organizations: unknown;
    releasePattern: string | null;
    releasePrecision: string;
    releaseWindow: unknown;
    seasonLabel: string;
    section: string;
    sortKey: string | null;
    sourceRow: number;
    timing: string;
  },
  showId: string,
  index: number,
): CanonicalSeasonSeedRow {
  return {
    id: row.id,
    showId,
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
    sourceRow: row.sourceRow || 1_000_000 + index,
    organizations: organizations(row.organizations),
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

function personalEpisodeToSeedRow(
  row: {
    episodeLabel: string | null;
    externalLinks: unknown;
    id: string;
    notes: string | null;
    releaseWindow: unknown;
    sortKey: string | null;
    title: string | null;
  },
  seasonId: string,
  id = row.id,
): CanonicalEpisodeSeedRow {
  return {
    id,
    seasonId,
    episodeLabel: row.episodeLabel,
    title: row.title,
    releaseWindow: releaseWindow(row.releaseWindow),
    sortKey: row.sortKey,
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function publishedShowToSeedRow(
  row: {
    countries: unknown;
    displayTitle: string;
    externalLinks: unknown;
    genreTags: unknown;
    id: string;
    languages: unknown;
    notes: string | null;
    originalTitle: string | null;
  },
  id: string,
): CanonicalShowSeedRow {
  return {
    id,
    displayTitle: row.displayTitle,
    originalTitle: row.originalTitle,
    languages: stringArray(row.languages),
    countries: stringArray(row.countries),
    genreTags: stringArray(row.genreTags),
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function publishedSeasonToSeedRow(
  row: {
    dateConfidence: string;
    endedReason: string;
    episodeCount: number | null;
    externalLinks: unknown;
    finaleWindow: unknown;
    notes: string | null;
    organizations: unknown;
    releasePattern: string | null;
    releasePrecision: string;
    releaseWindow: unknown;
    seasonLabel: string;
    section: string;
    sortKey: string | null;
    sourceRow: number;
    timing: string;
  },
  showId: string,
  id: string,
): CanonicalSeasonSeedRow {
  return {
    id,
    showId,
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

function publishedEpisodeToSeedRow(
  row: {
    episodeLabel: string | null;
    externalLinks: unknown;
    notes: string | null;
    releaseWindow: unknown;
    sortKey: string | null;
    title: string | null;
  },
  seasonId: string,
  id: string,
): CanonicalEpisodeSeedRow {
  return {
    id,
    seasonId,
    episodeLabel: row.episodeLabel,
    title: row.title,
    releaseWindow: releaseWindow(row.releaseWindow),
    sortKey: row.sortKey,
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
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

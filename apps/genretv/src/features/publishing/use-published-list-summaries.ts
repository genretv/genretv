import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { useMemo } from "react";

import { useAuth } from "../../auth/auth";
import { buildPublishedListSummaries } from "./imports";

const publishedList = genretvSyncRegistry.published_list.view!;
const publishedShow = genretvSyncRegistry.published_show.view!;
const publishedSeason = genretvSyncRegistry.published_season.view!;
const publishedEpisode = genretvSyncRegistry.published_episode.view!;
const listImport = genretvSyncRegistry.list_import.view!;
const userProfile = genretvSyncRegistry.user_profile.view!;

export function usePublishedListSummaries() {
  const { session } = useAuth();
  const lists = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedList.id,
          ownerId: publishedList.ownerId,
          slug: publishedList.slug,
          title: publishedList.title,
          description: publishedList.description,
          publicationStatus: publishedList.publicationStatus,
          snapshotVersion: publishedList.snapshotVersion,
          updatedAtUs: publishedList.updatedAtUs,
        })
        .from(publishedList),
    [],
  );
  const shows = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedShow.id,
          publishedListId: publishedShow.publishedListId,
          snapshotVersion: publishedShow.snapshotVersion,
          displayTitle: publishedShow.displayTitle,
          originalTitle: publishedShow.originalTitle,
          lifecycleStatus: publishedShow.lifecycleStatus,
          endedReason: publishedShow.endedReason,
          languages: publishedShow.languages,
          countries: publishedShow.countries,
          genreTags: publishedShow.genreTags,
          externalLinks: publishedShow.externalLinks,
          notes: publishedShow.notes,
        })
        .from(publishedShow),
    [],
  );
  const seasons = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedSeason.id,
          publishedListId: publishedSeason.publishedListId,
          publishedShowId: publishedSeason.publishedShowId,
          snapshotVersion: publishedSeason.snapshotVersion,
          section: publishedSeason.section,
          seasonNumber: publishedSeason.seasonNumber,
          seasonLabel: publishedSeason.seasonLabel,
          title: publishedSeason.title,
          releaseKind: publishedSeason.releaseKind,
          isFinal: publishedSeason.isFinal,
          timing: publishedSeason.timing,
          releasePattern: publishedSeason.releasePattern,
          releasePrecision: publishedSeason.releasePrecision,
          dateConfidence: publishedSeason.dateConfidence,
          releaseWindow: publishedSeason.releaseWindow,
          finaleWindow: publishedSeason.finaleWindow,
          episodeCount: publishedSeason.episodeCount,
          sortKey: publishedSeason.sortKey,
          sourceRow: publishedSeason.sourceRow,
          organizations: publishedSeason.organizations,
          externalLinks: publishedSeason.externalLinks,
          notes: publishedSeason.notes,
        })
        .from(publishedSeason),
    [],
  );
  const episodes = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedEpisode.id,
          publishedListId: publishedEpisode.publishedListId,
          publishedSeasonId: publishedEpisode.publishedSeasonId,
          snapshotVersion: publishedEpisode.snapshotVersion,
          canonicalEpisodeId: publishedEpisode.canonicalEpisodeId,
          episodeLabel: publishedEpisode.episodeLabel,
          title: publishedEpisode.title,
          releaseWindow: publishedEpisode.releaseWindow,
          sortKey: publishedEpisode.sortKey,
          externalLinks: publishedEpisode.externalLinks,
          notes: publishedEpisode.notes,
        })
        .from(publishedEpisode),
    [],
  );
  const imports = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          sourcePublishedSeasonId: listImport.sourcePublishedSeasonId,
          importMode: listImport.importMode,
        })
        .from(listImport),
    [],
    { ready: session != null },
  );
  const profiles = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          ownerId: userProfile.ownerId,
          displayName: userProfile.displayName,
          publicSlug: userProfile.publicSlug,
        })
        .from(userProfile),
    [],
  );

  const summaries = useMemo(
    () => buildPublishedListSummaries(lists.rows, shows.rows, seasons.rows, episodes.rows, imports.rows, profiles.rows),
    [episodes.rows, imports.rows, lists.rows, profiles.rows, seasons.rows, shows.rows],
  );
  const loading =
    lists.loading ||
    shows.loading ||
    seasons.loading ||
    episodes.loading ||
    profiles.loading ||
    (session != null && imports.loading);
  const error = lists.error ?? shows.error ?? seasons.error ?? episodes.error ?? profiles.error ?? imports.error;

  return { error, loading, session, summaries };
}

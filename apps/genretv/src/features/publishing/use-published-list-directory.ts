import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { and, count, eq } from "drizzle-orm";
import { createContext, createElement, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { liveAggregateState } from "../../domain/live-query-readiness";

const publishedList = genretvSyncRegistry.published_list.view!;
const publishedSeason = genretvSyncRegistry.published_season.view!;
const userProfile = genretvSyncRegistry.user_profile.view!;

type PublishedListDirectory = ReturnType<typeof usePublishedListDirectoryQuery>;

interface PublishedListDirectoryContextValue {
  activate: () => void;
  directory: PublishedListDirectory;
}

const PublishedListDirectoryContext = createContext<PublishedListDirectoryContextValue | null>(null);

export function PublishedListDirectoryProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const query = usePublishedListDirectoryQuery(active);
  const activate = useCallback(() => setActive(true), []);
  const directory = active ? query : { ...query, empty: false, loading: true };

  return createElement(PublishedListDirectoryContext.Provider, { value: { activate, directory } }, children);
}

export function usePublishedListDirectory(): PublishedListDirectory {
  const context = useContext(PublishedListDirectoryContext);
  if (context == null) {
    throw new Error("usePublishedListDirectory must be used inside PublishedListDirectoryProvider.");
  }

  const { activate, directory } = context;
  useEffect(() => activate(), [activate]);
  return directory;
}

function usePublishedListDirectoryQuery(ready: boolean) {
  const lists = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedList.id,
          ownerId: publishedList.ownerId,
          slug: publishedList.slug,
          title: publishedList.title,
          description: publishedList.description,
          snapshotVersion: publishedList.snapshotVersion,
          updatedAtUs: publishedList.updatedAtUs,
          publisherDisplayName: userProfile.displayName,
          publisherSlug: userProfile.publicSlug,
          rowCount: count(publishedSeason.id),
        })
        .from(publishedList)
        .leftJoin(userProfile, eq(userProfile.ownerId, publishedList.ownerId))
        .leftJoin(
          publishedSeason,
          and(
            eq(publishedSeason.publishedListId, publishedList.id),
            eq(publishedSeason.snapshotVersion, publishedList.snapshotVersion),
          ),
        )
        .where(eq(publishedList.publicationStatus, "published"))
        .groupBy(
          publishedList.id,
          publishedList.ownerId,
          publishedList.slug,
          publishedList.title,
          publishedList.description,
          publishedList.snapshotVersion,
          publishedList.updatedAtUs,
          userProfile.displayName,
          userProfile.publicSlug,
        )
        .orderBy(publishedList.title),
    [],
    { ready },
  );
  const state = liveAggregateState([lists], lists.rows.length > 0);

  return {
    empty: state.empty,
    error: lists.error,
    lists: lists.rows,
    loading: state.loading,
  };
}

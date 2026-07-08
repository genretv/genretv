import type { SQL } from "drizzle-orm";

import { defineSyncRegistry, type JwtClaims } from "@pgxsinkit/contracts";

import {
  canonicalProposalSyncEntry,
  canonicalEpisodeSyncEntry,
  canonicalSeasonSyncEntry,
  canonicalShowSyncEntry,
  listImportSyncEntry,
  maintainerNotificationSyncEntry,
  personalEpisodeSyncEntry,
  personalSeasonSyncEntry,
  personalShowSyncEntry,
  publishedEpisodeSyncEntry,
  publishedListSyncEntry,
  publishedSeasonSyncEntry,
  publishedShowSyncEntry,
  publishApplicationSyncEntry,
  userProfileSyncEntry,
} from "./schema";

function publicCanonicalReadFilter(_claims: JwtClaims): SQL | null {
  return null;
}

export const genretvSyncRegistry = defineSyncRegistry({
  canonical_show: {
    ...canonicalShowSyncEntry,
    shape: { ...canonicalShowSyncEntry.shape!, rowFilter: { customWhere: publicCanonicalReadFilter } },
  },
  canonical_season: {
    ...canonicalSeasonSyncEntry,
    shape: { ...canonicalSeasonSyncEntry.shape!, rowFilter: { customWhere: publicCanonicalReadFilter } },
  },
  canonical_episode: {
    ...canonicalEpisodeSyncEntry,
    shape: { ...canonicalEpisodeSyncEntry.shape!, rowFilter: { customWhere: publicCanonicalReadFilter } },
  },
  personal_show: personalShowSyncEntry,
  personal_season: personalSeasonSyncEntry,
  personal_episode: personalEpisodeSyncEntry,
  user_profile: userProfileSyncEntry,
  published_list: publishedListSyncEntry,
  published_show: publishedShowSyncEntry,
  published_season: publishedSeasonSyncEntry,
  published_episode: publishedEpisodeSyncEntry,
  list_import: listImportSyncEntry,
  publish_application: publishApplicationSyncEntry,
  canonical_proposal: canonicalProposalSyncEntry,
  maintainer_notification: maintainerNotificationSyncEntry,
});

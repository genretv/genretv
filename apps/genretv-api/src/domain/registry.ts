import type { SQL } from "drizzle-orm";

import { defineSyncRegistry, type JwtClaims } from "@pgxsinkit/contracts";

import { canonicalSeasonSyncEntry, canonicalShowSyncEntry } from "./schema";

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
});

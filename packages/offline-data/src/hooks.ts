import type { genretvSyncRegistry } from "@genretv/domain/registry";

import { createSyncClientHooks } from "@pgxsinkit/react";

export const { SyncClientProvider, useLiveDrizzleRows, useLiveRows, useSyncClient } =
  createSyncClientHooks<typeof genretvSyncRegistry>();

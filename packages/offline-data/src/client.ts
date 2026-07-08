import { attachSyncClient, type AttachedSyncClient, type AuthTokenSnapshot, type BridgePort } from "@pgxsinkit/client";
import type { SyncRuntimeStatus } from "@pgxsinkit/contracts";

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { claimGenretvStore } from "./store-registry";

export type GenretvSyncClient = AttachedSyncClient<typeof genretvSyncRegistry>;

export interface CreateGenretvWorkerClientOptions {
  getPort: (dataDir: string) => BridgePort;
  getToken: () => Promise<AuthTokenSnapshot | null>;
  onStatusChange?: (status: SyncRuntimeStatus) => void;
  userId: string | null;
}

export async function createGenretvWorkerClient(
  options: CreateGenretvWorkerClientOptions,
): Promise<GenretvSyncClient> {
  const store = claimGenretvStore(options.userId);
  return attachSyncClient({
    registry: genretvSyncRegistry,
    port: options.getPort(store.dataDir),
    storeId: store.storeId,
    dataDir: store.dataDir,
    freshStore: store.fresh,
    getToken: options.getToken,
    ...(options.onStatusChange ? { onStatusChange: options.onStatusChange } : {}),
  });
}

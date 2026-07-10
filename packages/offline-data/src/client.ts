import { canonicalExportSyncRegistry, genretvSyncRegistry } from "@genretv/domain/registry";

import { attachSyncClient, type AttachedSyncClient, type AuthTokenSnapshot, type BridgePort } from "@pgxsinkit/client";
import type { SyncRuntimeStatus } from "@pgxsinkit/contracts";

import { claimGenretvStore } from "./store-registry";

export type GenretvSyncClient = AttachedSyncClient<typeof genretvSyncRegistry>;
export type CanonicalExportSyncClient = AttachedSyncClient<typeof canonicalExportSyncRegistry>;

export const canonicalExportStoreId = "canonical-export-v1";
export const canonicalExportStorePath = "pgxsinkit-genretv-canonical-export-v1";

export interface CreateGenretvWorkerClientOptions {
  getPort: (storePath: string) => BridgePort;
  getToken: () => Promise<AuthTokenSnapshot | null>;
  onStatusChange?: (status: SyncRuntimeStatus) => void;
  userId: string | null;
}

export async function createGenretvWorkerClient(options: CreateGenretvWorkerClientOptions): Promise<GenretvSyncClient> {
  const store = claimGenretvStore(options.userId);
  return attachSyncClient({
    registry: genretvSyncRegistry,
    port: options.getPort(store.storePath),
    storeId: store.storeId,
    storePath: store.storePath,
    freshStore: store.fresh,
    getToken: options.getToken,
    ...(options.onStatusChange ? { onStatusChange: options.onStatusChange } : {}),
  });
}

export async function createCanonicalExportWorkerClient(
  getPort: (storePath: string) => BridgePort,
): Promise<CanonicalExportSyncClient> {
  return attachSyncClient({
    registry: canonicalExportSyncRegistry,
    port: getPort(canonicalExportStorePath),
    storeId: canonicalExportStoreId,
    storePath: canonicalExportStorePath,
  });
}

import { canonicalExportSyncRegistry, genretvSyncRegistry } from "@genretv/domain/registry";

import { defineSyncWorker } from "@pgxsinkit/client";

export interface GenretvWorkerConfig {
  electricUrl: string;
  functionsRegion: string;
  publishableKey: string;
  writeUrl: string;
}

export function defineGenretvSyncWorker(config: GenretvWorkerConfig): void {
  defineSyncWorker({
    registry: genretvSyncRegistry,
    electricUrl: config.electricUrl,
    writeUrl: config.writeUrl,
    convergenceIntervalMs: 15_000,
    requestHeaders: { apikey: config.publishableKey },
    ...(config.functionsRegion ? { writeRequestHeaders: { "x-region": config.functionsRegion } } : {}),
  });
}

export function defineCanonicalExportWorker(config: GenretvWorkerConfig): void {
  defineSyncWorker({
    registry: canonicalExportSyncRegistry,
    electricUrl: config.electricUrl,
    writeUrl: config.writeUrl,
    convergenceIntervalMs: 15_000,
    requestHeaders: { apikey: config.publishableKey },
    ...(config.functionsRegion ? { writeRequestHeaders: { "x-region": config.functionsRegion } } : {}),
  });
}

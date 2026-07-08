/// <reference lib="webworker" />
import { defineGenretvSyncWorker } from "@genretv/offline-data/worker";

import { genretvConfig } from "../config";

if (import.meta.env.DEV || import.meta.env["VITE_E2E"] === "1") {
  (globalThis as { __pgxsinkitDebug?: boolean }).__pgxsinkitDebug = true;
}

defineGenretvSyncWorker(genretvConfig);

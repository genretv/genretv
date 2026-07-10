/// <reference lib="webworker" />
import { defineCanonicalExportWorker } from "@genretv/offline-data/worker";

import { genretvConfig } from "../config";

if (import.meta.env.DEV || import.meta.env["VITE_E2E"] === "1") {
  (globalThis as { __pgxsinkitDebug?: boolean }).__pgxsinkitDebug = true;
}

defineCanonicalExportWorker(genretvConfig);

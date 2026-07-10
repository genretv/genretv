import type { BridgePort } from "@pgxsinkit/client";

const workersByName = new Map<string, SharedWorker>();

export function getGenretvWorkerPort(storePath: string): BridgePort {
  const worker = getGenretvWorker(storePath);
  return worker.port as unknown as BridgePort;
}

export function getCanonicalExportWorkerPort(storePath: string): BridgePort {
  const worker = new SharedWorker(new URL("./canonical-export.worker.ts", import.meta.url), {
    type: "module",
    name: storePath,
  });
  return worker.port as unknown as BridgePort;
}

function getGenretvWorker(storePath: string): SharedWorker {
  const existing = workersByName.get(storePath);
  if (existing != null) return existing;
  const worker = new SharedWorker(new URL("./genretv-sync.worker.ts", import.meta.url), {
    type: "module",
    name: storePath,
  });
  workersByName.set(storePath, worker);
  return worker;
}

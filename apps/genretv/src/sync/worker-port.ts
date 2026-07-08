import type { BridgePort } from "@pgxsinkit/client";

const workersByName = new Map<string, SharedWorker>();

export function getGenretvWorkerPort(dataDir: string): BridgePort {
  const worker = getGenretvWorker(dataDir);
  return worker.port as unknown as BridgePort;
}

function getGenretvWorker(dataDir: string): SharedWorker {
  const existing = workersByName.get(dataDir);
  if (existing != null) return existing;
  const worker = new SharedWorker(new URL("./genretv-sync.worker.ts", import.meta.url), {
    type: "module",
    name: dataDir,
  });
  workersByName.set(dataDir, worker);
  return worker;
}

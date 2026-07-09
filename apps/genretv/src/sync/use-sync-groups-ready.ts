import type { genretvSyncRegistry } from "@genretv/domain/registry";
import type { SyncTableName } from "@pgxsinkit/contracts";
import { useEffect, useState } from "react";

type GenretvSyncTableName = SyncTableName<typeof genretvSyncRegistry>;
type SyncGroupReadyClient = {
  groupReady: (table: GenretvSyncTableName) => Promise<void>;
};

export function useSyncGroupsReady(
  client: SyncGroupReadyClient,
  enabled: boolean,
  ...tables: readonly GenretvSyncTableName[]
) {
  const tableKey = tables.join("\0");
  const [state, setState] = useState<{ error: Error | null; ready: boolean }>({
    error: null,
    ready: !enabled,
  });

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ error: null, ready: true });
      return () => {
        active = false;
      };
    }

    const tablesForEffect = tableKey.split("\0") as GenretvSyncTableName[];
    setState({ error: null, ready: false });
    void Promise.all(tablesForEffect.map((table) => client.groupReady(table)))
      .then(() => {
        if (active) setState({ error: null, ready: true });
      })
      .catch((cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        if (active) setState({ error, ready: false });
      });

    return () => {
      active = false;
    };
  }, [client, enabled, tableKey]);

  return state;
}

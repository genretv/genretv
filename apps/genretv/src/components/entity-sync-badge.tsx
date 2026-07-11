import { Badge } from "@mantine/core";
import { IconAlertTriangle, IconCloudUp } from "@tabler/icons-react";

import type { GenretvSyncTable, LocalMutationState } from "../sync/sync-status";
import { useGenretvSyncStatus } from "../sync/sync-status";

export function EntitySyncBadge({ entityId, table }: { entityId: string | null; table: GenretvSyncTable }) {
  const { mutations, online } = useGenretvSyncStatus();
  if (entityId == null) return null;

  const state = entityMutationState(mutations, table, entityId, online);
  if (state == null) return null;
  const Icon = state.issue ? IconAlertTriangle : IconCloudUp;

  return (
    <Badge color={state.color} variant="light" leftSection={<Icon aria-hidden="true" size={12} />}>
      {state.label}
    </Badge>
  );
}

export function entityMutationState(
  mutations: readonly LocalMutationState[],
  table: GenretvSyncTable,
  entityId: string,
  online: boolean,
): { color: string; issue: boolean; label: string } | null {
  const statuses = new Set(
    mutations
      .filter((mutation) => mutation.table === table && Object.values(mutation.entityKey).includes(entityId))
      .map((mutation) => mutation.status),
  );
  if (statuses.size === 0) return null;
  if (statuses.has("conflicted")) return { color: "red", issue: true, label: "Conflict" };
  if (statuses.has("quarantined") || statuses.has("rejected")) {
    return { color: "red", issue: true, label: "Needs attention" };
  }
  if (statuses.has("failed")) return { color: "yellow", issue: true, label: "Sync delayed" };
  return { color: online ? "blue" : "gray", issue: false, label: online ? "Pending sync" : "Saved offline" };
}

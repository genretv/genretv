import { Button } from "@mantine/core";
import { IconAlertTriangle, IconCloudCheck, IconCloudOff, IconCloudUp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { useGenretvSyncStatus } from "../sync/sync-status";

export function SyncStatusButton() {
  const { loading, online, runtime, summary } = useGenretvSyncStatus();
  const terminal = summary.conflicted + summary.quarantined + summary.rejected;
  const delayed = summary.failed;
  const unsettled = summary.pending + summary.sending + summary.acked;
  const status = loading
    ? { color: "blue", icon: IconCloudUp, label: "Loading sync status" }
    : terminal > 0
      ? { color: "red", icon: IconAlertTriangle, label: `${terminal} sync ${terminal === 1 ? "issue" : "issues"}` }
      : delayed > 0
        ? { color: "yellow", icon: IconAlertTriangle, label: "Sync delayed" }
        : unsettled > 0
          ? { color: "blue", icon: IconCloudUp, label: `${unsettled} pending` }
          : !online
            ? { color: "gray", icon: IconCloudOff, label: "Offline" }
            : runtime.phase === "auth-needed"
              ? { color: "yellow", icon: IconAlertTriangle, label: "Sign in to sync" }
              : runtime.phase === "syncing" || runtime.phase === "booting"
                ? { color: "blue", icon: IconCloudUp, label: "Updating" }
                : runtime.phase === "degraded"
                  ? { color: "yellow", icon: IconAlertTriangle, label: "Sync delayed" }
                  : { color: "teal", icon: IconCloudCheck, label: "Synchronized" };
  const Icon = status.icon;

  return (
    <Button
      component={Link}
      to="/sync"
      size="xs"
      variant="light"
      color={status.color}
      leftSection={<Icon aria-hidden="true" size={15} />}
      aria-label={`Synchronization: ${status.label}`}
    >
      <span className="sync-status-label">{status.label}</span>
    </Button>
  );
}

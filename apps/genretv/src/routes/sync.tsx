import { useSyncClient } from "@genretv/offline-data/hooks";
import { Alert, Badge, Button, Group, Stack, Table, Text, Title } from "@mantine/core";
import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "../auth/auth";
import { formatMicrosecondTimestamp } from "../domain/time";
import {
  type GenretvSyncTable,
  type LocalMutationState,
  useAllMutationDetails,
  useGenretvSyncStatus,
} from "../sync/sync-status";

export function SyncRoute() {
  const { session } = useAuth();
  const client = useSyncClient();
  const status = useGenretvSyncStatus();
  const details = useAllMutationDetails(session != null);
  const { online, runtime, summary } = status;
  const { mutations } = details;
  const loading = status.loading || details.loading;
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (session == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={800} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Synchronization</Title>
        <Alert color="yellow" variant="light">
          Sign in to inspect changes stored in your mapped local database.
        </Alert>
        <Button component={Link} to="/login" variant="default">
          Sign in
        </Button>
      </Stack>
    );
  }

  const retry = async (table?: GenretvSyncTable) => {
    setWorkingKey(table ?? "all");
    setActionError(null);
    try {
      await client.retryFailed(table);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorkingKey(null);
    }
  };

  const discard = async (mutation: LocalMutationState) => {
    setWorkingKey(mutation.mutationId);
    setActionError(null);
    try {
      if (mutation.status === "conflicted") {
        await client.discardConflict(mutation.table, mutation.entityKey);
      } else {
        await client.discardQuarantined(mutation.table, mutation.entityKey);
      }
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setWorkingKey(null);
    }
  };

  if (loading) {
    return (
      <Stack className="schedule-panel" gap="lg" maw={1180} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Synchronization</Title>
        <Alert color="blue" variant="light">
          Loading local synchronization state...
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={1180} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Synchronization</Title>
          <Text c="dimmed">
            Local changes remain here until the server accepts them and Electric returns the result.
          </Text>
        </div>
        <Button component={Link} to="/export" variant="default" leftSection={<IconDownload size={16} />}>
          Export local database
        </Button>
      </Group>

      <Group gap="xs">
        <Badge color={online ? "teal" : "gray"}>{online ? "Online" : "Offline"}</Badge>
        <Badge variant="light">Read sync: {runtime.phase}</Badge>
        <Badge color={summary.total === 0 ? "teal" : "blue"}>{summary.total} unsettled</Badge>
        {summary.failed > 0 && <Badge color="yellow">{summary.failed} delayed</Badge>}
        {summary.conflicted > 0 && <Badge color="red">{summary.conflicted} conflicted</Badge>}
        {summary.quarantined + summary.rejected > 0 && (
          <Badge color="red">{summary.quarantined + summary.rejected} rejected</Badge>
        )}
      </Group>

      {actionError != null && (
        <Alert color="red" variant="light">
          Could not update local synchronization state: {actionError}
        </Alert>
      )}

      {summary.failed > 0 && (
        <Alert color="yellow" variant="light">
          <Group justify="space-between">
            <Text size="sm">
              Some writes are waiting for their retry backoff. Retry them now after connectivity returns.
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              loading={workingKey === "all"}
              disabled={!online}
              onClick={() => void retry()}
            >
              Retry now
            </Button>
          </Group>
        </Alert>
      )}

      {mutations.length === 0 ? (
        <Alert color="teal" variant="light">
          All local changes are synchronized.
        </Alert>
      ) : (
        <Table.ScrollContainer minWidth={920}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th>Record</Table.Th>
                <Table.Th>Change</Table.Th>
                <Table.Th>Attempts</Table.Th>
                <Table.Th>Details</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mutations.map((mutation) => (
                <Table.Tr key={mutation.mutationId}>
                  <Table.Td>
                    <Badge color={statusColor(mutation.status)} variant="light">
                      {statusLabel(mutation.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {humanizeTable(mutation.table)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatEntityKey(mutation.entityKey)}
                    </Text>
                  </Table.Td>
                  <Table.Td>{mutation.mutationKind}</Table.Td>
                  <Table.Td>{mutation.attemptCount}</Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {mutation.conflictReason ?? mutation.lastError ?? statusDescription(mutation.status)}
                    </Text>
                    {mutation.lastHttpStatus != null && (
                      <Text size="xs" c="dimmed">
                        HTTP {mutation.lastHttpStatus}
                      </Text>
                    )}
                    {mutation.nextRetryAtUs != null && (
                      <Text size="xs" c="dimmed">
                        Next retry {formatMicrosecondTimestamp(mutation.nextRetryAtUs)}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {mutation.status === "failed" ? (
                      <Button
                        size="compact-sm"
                        variant="light"
                        loading={workingKey === mutation.table}
                        disabled={!online}
                        onClick={() => void retry(mutation.table)}
                      >
                        Retry table
                      </Button>
                    ) : mutation.status === "conflicted" ||
                      mutation.status === "quarantined" ||
                      mutation.status === "rejected" ? (
                      <Group gap="xs" wrap="nowrap">
                        <Button component={Link} to="/manage" size="compact-sm" variant="light">
                          Edit and reapply
                        </Button>
                        <Button
                          size="compact-sm"
                          variant="default"
                          loading={workingKey === mutation.mutationId}
                          onClick={() => void discard(mutation)}
                        >
                          {mutation.status === "conflicted" ? "Use server version" : "Discard local change"}
                        </Button>
                      </Group>
                    ) : null}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}

function statusColor(status: string): string {
  if (status === "conflicted" || status === "quarantined" || status === "rejected") return "red";
  if (status === "failed") return "yellow";
  if (status === "acked") return "cyan";
  return "blue";
}

function statusLabel(status: string): string {
  if (status === "acked") return "awaiting echo";
  if (status === "quarantined" || status === "rejected") return "rejected";
  return status;
}

function statusDescription(status: string): string {
  if (status === "pending") return "Saved locally and waiting to send.";
  if (status === "sending") return "Sending to the server.";
  if (status === "acked") return "Accepted; waiting for the synchronized server version.";
  if (status === "failed") return "The last send failed and will retry with backoff.";
  if (status === "conflicted") return "The server row changed after this local edit was authored.";
  return "The server cannot accept this local change as authored.";
}

function humanizeTable(table: string): string {
  return table.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEntityKey(entityKey: Record<string, string>): string {
  const values = Object.values(entityKey);
  return values.length === 0 ? "Unknown record" : values.join(" / ");
}

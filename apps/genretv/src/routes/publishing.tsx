import { Alert, Badge, Button, Group, ScrollArea, Stack, Table, Text, Textarea, Title } from "@mantine/core";
import { useState } from "react";

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import { useAuth } from "../auth/auth";

const publishApplication = genretvSyncRegistry.publish_application.view!;
const maintainerNotification = genretvSyncRegistry.maintainer_notification.view!;

export function PublishingRoute() {
  const { roles, session } = useAuth();
  const client = useSyncClient();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isMaintainer = roles.includes("canonical_maintainer");
  const applications = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishApplication.id,
          ownerId: publishApplication.ownerId,
          message: publishApplication.message,
          status: publishApplication.status,
          reviewerNote: publishApplication.reviewerNote,
          createdAtUs: publishApplication.createdAtUs,
          updatedAtUs: publishApplication.updatedAtUs,
        })
        .from(publishApplication),
    [],
    { ready: session != null },
  );
  const notifications = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: maintainerNotification.id,
          status: maintainerNotification.status,
          title: maintainerNotification.title,
          body: maintainerNotification.body,
          relatedPublishApplicationId: maintainerNotification.relatedPublishApplicationId,
          createdAtUs: maintainerNotification.createdAtUs,
        })
        .from(maintainerNotification),
    [],
    { ready: session != null && isMaintainer },
  );

  const submitApplication = async () => {
    const applicationId = crypto.randomUUID();
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.publish_application.create({
          id: applicationId,
          message: nullableText(message),
        });
        tx.tables.maintainer_notification.create({
          id: crypto.randomUUID(),
          notificationKind: "publish_application",
          status: "unread",
          title: "Publisher application",
          body: nullableText(message),
          relatedPublishApplicationId: applicationId,
          relatedCanonicalProposalId: null,
        });
      });
      setSaved(true);
      setMessage("");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const updateApplicationStatus = async (id: string, status: "approved" | "rejected" | "closed") => {
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.publish_application.update({ id }, { status });
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  if (session == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Publishing</Title>
        <Alert color="yellow" variant="light">
          Sign in to apply to publish your list.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={1080} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Publishing</Title>
          <Text c="dimmed">Apply to publish your list or review incoming requests.</Text>
        </div>
        {isMaintainer && <Badge variant="light">Maintainer</Badge>}
      </Group>

      {applications.error != null && (
        <Alert color="red" variant="light">
          Could not load publish applications: {applications.error.message}
        </Alert>
      )}
      {notifications.error != null && (
        <Alert color="red" variant="light">
          Could not load maintainer notifications: {notifications.error.message}
        </Alert>
      )}
      {actionError != null && (
        <Alert color="red" variant="light">
          Could not save publishing workflow change: {actionError}
        </Alert>
      )}
      {saved && (
        <Alert color="teal" variant="light">
          Application sent.
        </Alert>
      )}

      <Stack gap="sm">
        <Title order={2}>Apply to publish</Title>
        <Textarea
          label="Message"
          autosize
          minRows={4}
          value={message}
          onChange={(event) => setMessage(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button loading={saving} onClick={() => void submitApplication()}>
            Apply to publish
          </Button>
        </Group>
      </Stack>

      <Stack gap="sm">
        <Title order={2}>{isMaintainer ? "Applications" : "Your applications"}</Title>
        <ScrollArea>
          <Table className="schedule-table" striped verticalSpacing="sm" miw={760}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Updated</Table.Th>
                {isMaintainer && <Table.Th>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {applications.rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isMaintainer ? 4 : 3}>
                    <Text c="dimmed">No applications yet.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                applications.rows.map((application) => (
                  <Table.Tr key={application.id}>
                    <Table.Td>
                      <Badge variant="light">{application.status}</Badge>
                    </Table.Td>
                    <Table.Td>{application.message ?? ""}</Table.Td>
                    <Table.Td>{formatMicroseconds(application.updatedAtUs)}</Table.Td>
                    {isMaintainer && (
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            disabled={saving}
                            onClick={() => void updateApplicationStatus(application.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            disabled={saving}
                            onClick={() => void updateApplicationStatus(application.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>

      {isMaintainer && (
        <Stack gap="sm">
          <Title order={2}>Notifications</Title>
          {notifications.rows.length === 0 ? (
            <Text c="dimmed">No maintainer notifications yet.</Text>
          ) : (
            notifications.rows.map((notification) => (
              <Alert key={notification.id} color={notification.status === "unread" ? "yellow" : "gray"} variant="light">
                <Text fw={700}>{notification.title}</Text>
                <Text size="sm">{notification.body ?? ""}</Text>
              </Alert>
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function formatMicroseconds(value: bigint): string {
  const millis = Number(value / 1000n);
  return Number.isFinite(millis) ? new Date(millis).toLocaleString() : "";
}

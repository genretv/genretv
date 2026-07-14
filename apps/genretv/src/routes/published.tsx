import { Alert, Badge, Button, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useAuth } from "../auth/auth";
import { formatMicrosecondTimestamp } from "../domain/time";
import { PublisherAttribution } from "../features/publishing/published-list-table";
import { usePublishedListDirectory } from "../features/publishing/use-published-list-directory";

export function PublishedRoute() {
  const { session } = useAuth();
  const { empty, error, lists, loading } = usePublishedListDirectory();

  return (
    <Stack className="schedule-panel" gap="lg" maw={1220} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Published Lists</Title>
          <Text c="dimmed">Browse public overlays and import seasons into your own list.</Text>
        </div>
        {session == null && (
          <Button component={Link} to="/login" variant="default">
            Sign in to import
          </Button>
        )}
      </Group>

      {error != null && (
        <Alert color="red" variant="light">
          Could not load published lists.
        </Alert>
      )}
      {loading && (
        <Alert color="blue" variant="light">
          Loading published lists...
        </Alert>
      )}
      {empty && (
        <Alert color="yellow" variant="light">
          No public lists have been published yet.
        </Alert>
      )}

      {lists.length > 0 && (
        <ScrollArea>
          <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={760}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>List</Table.Th>
                <Table.Th>Publisher</Table.Th>
                <Table.Th>Rows</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lists.map((list) => (
                <Table.Tr key={list.id}>
                  <Table.Td>
                    <Stack gap={3}>
                      <Group gap="xs">
                        <Link className="inline-link-button" to="/published/$slug" params={{ slug: list.slug }}>
                          <Text fw={700}>{list.title}</Text>
                        </Link>
                        <Badge variant="light">{list.slug}</Badge>
                        <Badge color="gray" variant="outline">
                          v{list.snapshotVersion}
                        </Badge>
                      </Group>
                      {list.description != null && (
                        <Text size="sm" c="dimmed">
                          {list.description}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <PublisherAttribution displayName={list.publisherDisplayName} publicSlug={list.publisherSlug} />
                  </Table.Td>
                  <Table.Td>{list.rowCount}</Table.Td>
                  <Table.Td>{formatMicrosecondTimestamp(list.updatedAtUs)}</Table.Td>
                  <Table.Td>
                    <Button
                      renderRoot={(props) => <Link {...props} to="/published/$slug" params={{ slug: list.slug }} />}
                      size="xs"
                      variant="default"
                    >
                      Browse
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  );
}

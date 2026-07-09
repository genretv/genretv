import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { PublishedListRowsTable, PublisherAttribution } from "../features/publishing/published-list-table";
import { useImportPublishedSeason } from "../features/publishing/use-import-published-season";
import { usePublishedListSummaries } from "../features/publishing/use-published-list-summaries";

export function PublishedRoute() {
  const { error, loading, session, summaries } = usePublishedListSummaries();
  const { actionError, importSeason, removeLinkedImport, savingKey } = useImportPublishedSeason();

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

      {actionError != null && (
        <Alert color="red" variant="light">
          Could not import season: {actionError}
        </Alert>
      )}
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
      {!loading && summaries.length === 0 && (
        <Alert color="yellow" variant="light">
          No public lists have been published yet.
        </Alert>
      )}

      {summaries.map((list) => (
        <Stack key={list.id} gap="sm">
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="xs">
                <Title order={2}>
                  <Link className="inline-link-button" to="/published/$slug" params={{ slug: list.slug }}>
                    {list.title}
                  </Link>
                </Title>
                <Badge variant="light">{list.slug}</Badge>
                <Badge color="gray" variant="outline">
                  v{list.snapshotVersion}
                </Badge>
              </Group>
              {list.description != null && (
                <Text size="sm" c="dimmed" mt={4}>
                  {list.description}
                </Text>
              )}
              <PublisherAttribution displayName={list.publisherDisplayName} publicSlug={list.publisherSlug} />
            </div>
            <Text size="sm" c="dimmed">
              {list.seasons.length} rows
            </Text>
          </Group>

          <PublishedListRowsTable
            canImport={session != null}
            list={list}
            onImportSeason={(season, importMode) => void importSeason(season, importMode)}
            onRemoveLinkedImport={(season) => void removeLinkedImport(season)}
            savingKey={savingKey}
          />
        </Stack>
      ))}
    </Stack>
  );
}

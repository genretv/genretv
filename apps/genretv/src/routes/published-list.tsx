import { Alert, Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { PublishedListRowsTable, PublisherAttribution } from "../features/publishing/published-list-table";
import { useImportPublishedSeason } from "../features/publishing/use-import-published-season";
import { usePublishedListSummaries } from "../features/publishing/use-published-list-summaries";

export function PublishedListRoute() {
  const { slug } = useParams({ from: "/published/$slug" });
  const { error, loading, session, summaries } = usePublishedListSummaries();
  const { actionError, importSeason, removeLinkedImport, savingKey } = useImportPublishedSeason();
  const list = useMemo(() => summaries.find((summary) => summary.slug === slug) ?? null, [slug, summaries]);

  return (
    <Stack className="schedule-panel" gap="lg" maw={1220} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="xs">
            <Title order={1}>{list?.title ?? "Published List"}</Title>
            <Badge variant="light">{slug}</Badge>
            {list != null && (
              <Badge color="gray" variant="outline">
                v{list.snapshotVersion}
              </Badge>
            )}
          </Group>
          {list?.description != null && (
            <Text size="sm" c="dimmed" mt={4}>
              {list.description}
            </Text>
          )}
          {list != null && (
            <PublisherAttribution displayName={list.publisherDisplayName} publicSlug={list.publisherSlug} />
          )}
        </div>
        <Group gap="xs">
          {session == null && (
            <Button component={Link} to="/login" variant="default">
              Sign in to import
            </Button>
          )}
          <Button component={Link} to="/published" variant="default">
            All published lists
          </Button>
        </Group>
      </Group>

      {actionError != null && (
        <Alert color="red" variant="light">
          Could not import season: {actionError}
        </Alert>
      )}
      {error != null && (
        <Alert color="red" variant="light">
          Could not load this published list.
        </Alert>
      )}
      {loading && (
        <Alert color="blue" variant="light">
          Loading published list...
        </Alert>
      )}
      {!loading && list == null && (
        <Alert color="yellow" variant="light">
          No published list exists for this slug.
        </Alert>
      )}

      {list != null && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={2}>Rows</Title>
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
      )}
    </Stack>
  );
}

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import { Alert, Badge, Button, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { buildExclusionSummaries } from "../features/management/exclusions";

const canonicalShow = genretvSyncRegistry.canonical_show.view!;
const canonicalSeason = genretvSyncRegistry.canonical_season.view!;
const canonicalEpisode = genretvSyncRegistry.canonical_episode.view!;
const personalListExclusion = genretvSyncRegistry.personal_list_exclusion.view!;

export function ManageHiddenRoute() {
  const { session } = useAuth();
  const client = useSyncClient();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const exclusions = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalListExclusion.id,
          excludedKind: personalListExclusion.excludedKind,
          canonicalShowId: personalListExclusion.canonicalShowId,
          canonicalSeasonId: personalListExclusion.canonicalSeasonId,
          canonicalEpisodeId: personalListExclusion.canonicalEpisodeId,
          reason: personalListExclusion.reason,
        })
        .from(personalListExclusion),
    [],
    { ready: session != null },
  );
  const shows = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: canonicalShow.id,
          displayTitle: canonicalShow.displayTitle,
        })
        .from(canonicalShow),
    [],
  );
  const seasons = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: canonicalSeason.id,
          showId: canonicalSeason.showId,
          seasonLabel: canonicalSeason.seasonLabel,
        })
        .from(canonicalSeason),
    [],
  );
  const episodes = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: canonicalEpisode.id,
          seasonId: canonicalEpisode.seasonId,
          episodeLabel: canonicalEpisode.episodeLabel,
          title: canonicalEpisode.title,
        })
        .from(canonicalEpisode),
    [],
  );
  const summaries = useMemo(
    () => buildExclusionSummaries(exclusions.rows, shows.rows, seasons.rows, episodes.rows),
    [episodes.rows, exclusions.rows, seasons.rows, shows.rows],
  );
  const loading = shows.loading || seasons.loading || episodes.loading || (session != null && exclusions.loading);

  const restore = async (id: string) => {
    setRestoringId(id);
    setActionError(null);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.personal_list_exclusion.delete({ id });
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRestoringId(null);
    }
  };

  if (session == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Hidden Rows</Title>
        <Alert color="yellow" variant="light">
          Sign in to manage rows hidden from your personal list.
        </Alert>
        <Button component={Link} to="/login" variant="default">
          Sign in
        </Button>
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={1040} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Hidden Rows</Title>
          <Text c="dimmed">Restore canonical rows you have hidden from your personal list.</Text>
        </div>
        <Button component={Link} to="/manage" variant="default">
          Shows
        </Button>
      </Group>

      {actionError != null && (
        <Alert color="red" variant="light">
          Could not restore row: {actionError}
        </Alert>
      )}
      {(exclusions.error ?? shows.error ?? seasons.error ?? episodes.error) != null && (
        <Alert color="red" variant="light">
          Could not load hidden rows.
        </Alert>
      )}
      {loading && (
        <Alert color="blue" variant="light">
          Loading hidden rows...
        </Alert>
      )}
      {!loading && summaries.length === 0 && (
        <Alert color="teal" variant="light">
          You have not hidden any canonical rows.
        </Alert>
      )}

      {summaries.length > 0 && (
        <ScrollArea>
          <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={720}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Kind</Table.Th>
                <Table.Th>Row</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {summaries.map((summary) => (
                <Table.Tr key={summary.id}>
                  <Table.Td>
                    <Badge variant="light">{summary.kind}</Badge>
                  </Table.Td>
                  <Table.Td>{summary.label}</Table.Td>
                  <Table.Td>{summary.reason ?? ""}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      loading={restoringId === summary.id}
                      disabled={restoringId != null}
                      onClick={() => void restore(summary.id)}
                    >
                      Restore
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

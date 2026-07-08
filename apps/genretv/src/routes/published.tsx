import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import { Alert, Anchor, Badge, Button, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { buildPublishedListSummaries, type PublishedSeasonSummary } from "../features/publishing/imports";

const publishedList = genretvSyncRegistry.published_list.view!;
const publishedShow = genretvSyncRegistry.published_show.view!;
const publishedSeason = genretvSyncRegistry.published_season.view!;
const publishedEpisode = genretvSyncRegistry.published_episode.view!;
const listImport = genretvSyncRegistry.list_import.view!;
const userProfile = genretvSyncRegistry.user_profile.view!;

type ImportMode = "linked" | "detached";

export function PublishedRoute() {
  const { session } = useAuth();
  const client = useSyncClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lists = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedList.id,
          ownerId: publishedList.ownerId,
          slug: publishedList.slug,
          title: publishedList.title,
          description: publishedList.description,
          publicationStatus: publishedList.publicationStatus,
          snapshotVersion: publishedList.snapshotVersion,
          updatedAtUs: publishedList.updatedAtUs,
        })
        .from(publishedList),
    [],
  );
  const shows = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedShow.id,
          publishedListId: publishedShow.publishedListId,
          snapshotVersion: publishedShow.snapshotVersion,
          displayTitle: publishedShow.displayTitle,
          originalTitle: publishedShow.originalTitle,
          languages: publishedShow.languages,
          countries: publishedShow.countries,
          genreTags: publishedShow.genreTags,
          externalLinks: publishedShow.externalLinks,
          notes: publishedShow.notes,
        })
        .from(publishedShow),
    [],
  );
  const seasons = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedSeason.id,
          publishedListId: publishedSeason.publishedListId,
          publishedShowId: publishedSeason.publishedShowId,
          snapshotVersion: publishedSeason.snapshotVersion,
          section: publishedSeason.section,
          seasonLabel: publishedSeason.seasonLabel,
          timing: publishedSeason.timing,
          endedReason: publishedSeason.endedReason,
          releasePattern: publishedSeason.releasePattern,
          releasePrecision: publishedSeason.releasePrecision,
          dateConfidence: publishedSeason.dateConfidence,
          releaseWindow: publishedSeason.releaseWindow,
          finaleWindow: publishedSeason.finaleWindow,
          episodeCount: publishedSeason.episodeCount,
          sortKey: publishedSeason.sortKey,
          sourceRow: publishedSeason.sourceRow,
          organizations: publishedSeason.organizations,
          externalLinks: publishedSeason.externalLinks,
          notes: publishedSeason.notes,
        })
        .from(publishedSeason),
    [],
  );
  const episodes = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedEpisode.id,
          publishedListId: publishedEpisode.publishedListId,
          publishedSeasonId: publishedEpisode.publishedSeasonId,
          snapshotVersion: publishedEpisode.snapshotVersion,
          canonicalEpisodeId: publishedEpisode.canonicalEpisodeId,
          episodeLabel: publishedEpisode.episodeLabel,
          title: publishedEpisode.title,
          releaseWindow: publishedEpisode.releaseWindow,
          sortKey: publishedEpisode.sortKey,
          externalLinks: publishedEpisode.externalLinks,
          notes: publishedEpisode.notes,
        })
        .from(publishedEpisode),
    [],
  );
  const imports = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          sourcePublishedSeasonId: listImport.sourcePublishedSeasonId,
          importMode: listImport.importMode,
        })
        .from(listImport),
    [],
    { ready: session != null },
  );
  const profiles = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          ownerId: userProfile.ownerId,
          displayName: userProfile.displayName,
          publicSlug: userProfile.publicSlug,
        })
        .from(userProfile),
    [],
  );
  const summaries = useMemo(
    () => buildPublishedListSummaries(lists.rows, shows.rows, seasons.rows, episodes.rows, imports.rows, profiles.rows),
    [episodes.rows, imports.rows, lists.rows, profiles.rows, seasons.rows, shows.rows],
  );
  const loading =
    lists.loading ||
    shows.loading ||
    seasons.loading ||
    episodes.loading ||
    profiles.loading ||
    (session != null && imports.loading);

  const importSeason = async (season: PublishedSeasonSummary, importMode: ImportMode) => {
    const targetShowId = crypto.randomUUID();
    const targetSeasonId = crypto.randomUUID();
    setSavingKey(`${season.id}:${importMode}`);
    setActionError(null);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (importMode === "linked") {
          tx.tables.list_import.create({
            id: crypto.randomUUID(),
            sourcePublishedListId: season.publishedListId,
            sourcePublishedShowId: season.publishedShowId,
            sourcePublishedSeasonId: season.id,
            sourcePublishedEpisodeId: null,
            targetPersonalShowId: null,
            targetPersonalSeasonId: null,
            targetPersonalEpisodeId: null,
            importMode,
            importedKind: "season",
            notes: null,
          });
          return;
        }

        tx.tables.personal_show.create({
          id: targetShowId,
          canonicalShowId: null,
          displayTitle: season.displayTitle,
          originalTitle: season.originalTitle,
          languages: season.languages,
          countries: season.countries,
          genreTags: season.genreTags,
          externalLinks: season.externalLinks,
          notes: season.showNotes,
        });
        tx.tables.personal_season.create({
          id: targetSeasonId,
          personalShowId: targetShowId,
          canonicalShowId: null,
          canonicalSeasonId: null,
          section: scheduleSection(season.section),
          seasonLabel: season.seasonLabel,
          timing: season.timing,
          endedReason: season.endedReason,
          releasePattern: season.releasePattern,
          releasePrecision: season.releasePrecision,
          dateConfidence: season.dateConfidence,
          releaseWindow: season.releaseWindow,
          finaleWindow: season.finaleWindow,
          sortKey: season.sortKey,
          episodeCount: season.episodeCount,
          sourceRow: season.sourceRow,
          organizations: season.organizationSeeds,
          externalLinks: season.seasonExternalLinks,
          notes: season.notes,
        });
        for (const episode of season.episodes) {
          const targetEpisodeId = crypto.randomUUID();
          tx.tables.personal_episode.create({
            id: targetEpisodeId,
            canonicalShowId: null,
            canonicalSeasonId: null,
            canonicalEpisodeId: null,
            personalSeasonId: targetSeasonId,
            episodeLabel: episode.episodeLabel,
            title: episode.title,
            releaseWindow: episode.releaseWindow,
            sortKey: episode.sortKey,
            externalLinks: episode.externalLinks,
            notes: episode.notes,
          });
          tx.tables.list_import.create({
            id: crypto.randomUUID(),
            sourcePublishedListId: season.publishedListId,
            sourcePublishedShowId: season.publishedShowId,
            sourcePublishedSeasonId: season.id,
            sourcePublishedEpisodeId: episode.id,
            targetPersonalShowId: targetShowId,
            targetPersonalSeasonId: targetSeasonId,
            targetPersonalEpisodeId: targetEpisodeId,
            importMode,
            importedKind: "episode",
            notes: null,
          });
        }
        tx.tables.list_import.create({
          id: crypto.randomUUID(),
          sourcePublishedListId: season.publishedListId,
          sourcePublishedShowId: season.publishedShowId,
          sourcePublishedSeasonId: season.id,
          sourcePublishedEpisodeId: null,
          targetPersonalShowId: targetShowId,
          targetPersonalSeasonId: targetSeasonId,
          targetPersonalEpisodeId: null,
          importMode,
          importedKind: "season",
          notes: null,
        });
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingKey(null);
    }
  };

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
      {(lists.error ?? shows.error ?? seasons.error ?? episodes.error ?? profiles.error ?? imports.error) != null && (
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
                <Title order={2}>{list.title}</Title>
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
              <PublisherAttribution
                displayName={list.publisherDisplayName}
                publicSlug={list.publisherSlug}
              />
            </div>
            <Text size="sm" c="dimmed">
              {list.seasons.length} rows
            </Text>
          </Group>

          <ScrollArea>
            <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={980}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Show</Table.Th>
                  <Table.Th>Season</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Lang</Table.Th>
                  <Table.Th>Import</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {list.seasons.map((season) => (
                  <Table.Tr key={season.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={700}>{season.displayTitle}</Text>
                        {season.externalLinks.length > 0 && (
                          <Group gap={6}>
                            {season.externalLinks.map((link) => (
                              <Anchor key={`${season.id}-${link.url}`} href={link.url} target="_blank" size="xs">
                                {link.kind ?? link.label}
                              </Anchor>
                            ))}
                          </Group>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>{season.seasonLabel}</Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">{season.section === "past" ? season.endedReason : season.timing}</Text>
                        {season.releasePattern != null && (
                          <Text size="xs" c="dimmed">
                            {season.releasePattern}
                          </Text>
                        )}
                        {season.episodes.length > 0 && (
                          <Text size="xs" c="dimmed">
                            {season.episodes.length} episode rows
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>{season.organizationText || "Unknown"}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {season.languages.map((language) => (
                          <Badge key={`${season.id}-${language}`} size="xs" variant="light">
                            {language}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {season.importMode == null ? (
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            disabled={session == null || savingKey != null}
                            loading={savingKey === `${season.id}:linked`}
                            onClick={() => void importSeason(season, "linked")}
                          >
                            Link
                          </Button>
                          <Button
                            size="xs"
                            variant="default"
                            disabled={session == null || savingKey != null}
                            loading={savingKey === `${season.id}:detached`}
                            onClick={() => void importSeason(season, "detached")}
                          >
                            Copy
                          </Button>
                        </Group>
                      ) : (
                        <Badge color="teal" variant="light">
                          Imported: {season.importMode}
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Stack>
      ))}
    </Stack>
  );
}

function scheduleSection(value: string): "current" | "upcoming" | "past" {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

function PublisherAttribution({
  displayName,
  publicSlug,
}: {
  displayName: string | null;
  publicSlug: string | null;
}) {
  if (displayName == null) {
    return (
      <Text size="sm" c="dimmed" mt={4}>
        By a GenreTV publisher
      </Text>
    );
  }
  if (publicSlug == null) {
    return (
      <Text size="sm" c="dimmed" mt={4}>
        By {displayName}
      </Text>
    );
  }
  return (
    <Text size="sm" c="dimmed" mt={4}>
      By{" "}
      <Link className="inline-link-button" to="/profile/$slug" params={{ slug: publicSlug }}>
        {displayName}
      </Link>
    </Text>
  );
}

import {
  Alert,
  Badge,
  Button,
  Group,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { useAuth } from "../auth/auth";
import { canonicalSchedule } from "../domain/canonical-schedule";
import {
  buildManagementShows,
  findManagementSeason,
  formatEpisodeCount,
  sectionLabels,
  type ManagementSeason,
  type ManagementShow,
} from "../domain/schedule";
import {
  parseEpisodeCountDraft,
  seasonDraftFromSeason,
  seasonDraftStorageKey,
  useManagementDraft,
  type ManagementSeasonDraft,
} from "../features/management/drafts";

const shows = buildManagementShows(canonicalSchedule.entries);

export function ManageSeasonRoute() {
  const { showId, seasonId } = useParams({ from: "/manage/show/$showId/season/$seasonId" });
  const { session } = useAuth();
  const result = findManagementSeason(shows, showId, seasonId);

  if (result == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Season not found</Title>
        <Group>
          <Button component="a" href={`/manage/show/${showId}`} variant="default">
            Show
          </Button>
          <Button component="a" href="/manage" variant="default">
            Shows
          </Button>
        </Group>
      </Stack>
    );
  }

  return <EditableSeason show={result.show} season={result.season} canEdit={session != null} />;
}

function EditableSeason({
  show,
  season,
  canEdit,
}: {
  show: ManagementShow;
  season: ManagementSeason;
  canEdit: boolean;
}) {
  const status = season.section === "past" ? season.endedReason : sectionLabels[season.section];
  const episodeCount = formatEpisodeCount(season.episodeCount, season.episodes);
  const initialDraft = useMemo(() => seasonDraftFromSeason(season), [season]);
  const { draft, dirty, locallySaved, setDraft, saveLocalDraft, discardLocalDraft } = useManagementDraft(
    seasonDraftStorageKey(season.id),
    initialDraft,
  );
  const draftEpisodeCount = parseEpisodeCountDraft(draft.episodeCount);
  const episodeCountValid = draft.episodeCount.trim() === "" || draftEpisodeCount != null;
  const emptyEpisodeText =
    season.episodeCount === 1 ? "1 episode, no row yet" : `${episodeCount} episodes, no rows yet`;

  return (
    <Stack className="schedule-panel" gap="lg" maw={1040} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>
            {show.title} {season.seasonLabel}
          </Title>
          <Text c="dimmed">{status}</Text>
        </div>
        <Group>
          <Button component="a" href={`/manage/show/${show.id}`} variant="default">
            Show
          </Button>
          <Button component="a" href="/manage" variant="default">
            Shows
          </Button>
        </Group>
      </Group>

      <Alert color={canEdit ? "teal" : "yellow"} variant="light">
        {canEdit
          ? "Changes can be saved as a browser-local draft. Publishing to your overlay will be enabled when the writable pgxsinkit registry lands."
          : "Sign in to create a browser-local management draft."}
      </Alert>

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label="Season"
            value={draft.seasonLabel}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, seasonLabel: event.currentTarget.value }))}
          />
          <Select
            label="Section"
            value={draft.section}
            disabled={!canEdit}
            data={[
              { value: "current", label: sectionLabels.current },
              { value: "upcoming", label: sectionLabels.upcoming },
              { value: "past", label: sectionLabels.past },
            ]}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                section: (value ?? current.section) as ManagementSeasonDraft["section"],
              }))
            }
          />
          <TextInput
            label="Episodes"
            value={draft.episodeCount}
            disabled={!canEdit}
            error={!episodeCountValid ? "Use a whole number or leave blank" : null}
            onChange={(event) => setDraft((current) => ({ ...current, episodeCount: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label="When"
            value={draft.timing}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, timing: event.currentTarget.value }))}
          />
          <TextInput
            label="Release pattern"
            value={draft.releasePattern}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, releasePattern: event.currentTarget.value }))}
          />
          <TextInput
            label="Finished reason"
            value={draft.endedReason}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, endedReason: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <Textarea
          label="Notes"
          autosize
          minRows={4}
          value={draft.notes}
          disabled={!canEdit}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
        />
        <Group justify="space-between">
          <Group gap={4}>
            {season.languages.map((language) => (
              <Badge key={`${season.id}-${language}`} size="xs" variant="light">
                {language}
              </Badge>
            ))}
            {season.countries.map((country) => (
              <Badge key={`${season.id}-${country}`} size="xs" variant="outline">
                {country}
              </Badge>
            ))}
          </Group>
          <Group>
            <Button variant="default" disabled={!canEdit || !dirty} onClick={discardLocalDraft}>
              Discard
            </Button>
            <Button variant="light" disabled={!canEdit || !dirty || !episodeCountValid} onClick={saveLocalDraft}>
              Save draft
            </Button>
            <Button disabled>Save to overlay</Button>
          </Group>
        </Group>
        {locallySaved && (
          <Text size="sm" c="dimmed">
            Local draft saved.
          </Text>
        )}
      </Stack>

      <Stack gap="sm">
        <Title order={2}>Episodes</Title>
        <ScrollArea>
          <Table className="schedule-table" striped verticalSpacing="sm" miw={720}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={120}>Episode</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th w={180}>Air date</Table.Th>
                <Table.Th>Notes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {season.episodes.length > 0 ? (
                season.episodes.map((episode) => (
                  <Table.Tr key={episode.id}>
                    <Table.Td>{episode.episodeLabel || "Unknown"}</Table.Td>
                    <Table.Td>{episode.title || "Unknown"}</Table.Td>
                    <Table.Td>{episode.releaseDate || "Unknown"}</Table.Td>
                    <Table.Td>{episode.notes ?? ""}</Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed">{season.episodeCount == null ? "Episode count unknown" : emptyEpisodeText}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Stack>
  );
}

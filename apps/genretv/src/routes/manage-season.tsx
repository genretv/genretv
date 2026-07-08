import { Badge, Button, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { useParams } from "@tanstack/react-router";

import { canonicalSchedule } from "../domain/canonical-schedule";
import { buildManagementShows, findManagementSeason, formatEpisodeCount, sectionLabels } from "../domain/schedule";

const shows = buildManagementShows(canonicalSchedule.entries);

export function ManageSeasonRoute() {
  const { showId, seasonId } = useParams({ from: "/manage/show/$showId/season/$seasonId" });
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

  const { show, season } = result;
  const status = season.section === "past" ? season.endedReason : sectionLabels[season.section];
  const episodeCount = formatEpisodeCount(season.episodeCount, season.episodes);
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

      <Table className="schedule-table" verticalSpacing="sm">
        <Table.Tbody>
          <Table.Tr>
            <Table.Th w={150}>Status</Table.Th>
            <Table.Td>{status}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>When</Table.Th>
            <Table.Td>{season.timing}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Source</Table.Th>
            <Table.Td>{season.organizationText || "Unknown"}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Genre</Table.Th>
            <Table.Td>{season.genreText || "Unknown"}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Languages</Table.Th>
            <Table.Td>
              <Group gap={4}>
                {season.languages.length === 0 && <Text>Unknown</Text>}
                {season.languages.map((language) => (
                  <Badge key={`${season.id}-${language}`} size="xs" variant="light">
                    {language}
                  </Badge>
                ))}
              </Group>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Countries</Table.Th>
            <Table.Td>
              <Group gap={4}>
                {season.countries.length === 0 && <Text>Unknown</Text>}
                {season.countries.map((country) => (
                  <Badge key={`${season.id}-${country}`} size="xs" variant="light">
                    {country}
                  </Badge>
                ))}
              </Group>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Episodes</Table.Th>
            <Table.Td>{episodeCount}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

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

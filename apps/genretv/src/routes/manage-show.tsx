import { Anchor, Badge, Button, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { useParams } from "@tanstack/react-router";

import { canonicalSchedule } from "../domain/canonical-schedule";
import { buildManagementShows, findManagementShow, sectionLabels } from "../domain/schedule";

const shows = buildManagementShows(canonicalSchedule.entries);

export function ManageShowRoute() {
  const { showId } = useParams({ from: "/manage/show/$showId" });
  const show = findManagementShow(shows, showId);

  if (show == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Show not found</Title>
        <Button component="a" href="/manage" variant="default">
          Back to shows
        </Button>
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={1040} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{show.title}</Title>
          <Group gap={6} mt={6}>
            {show.links.map((link) => (
              <Anchor key={`${show.id}-${link.url}`} href={link.url} target="_blank" size="sm">
                {link.kind ?? link.label}
              </Anchor>
            ))}
          </Group>
        </div>
        <Button component="a" href="/manage" variant="default">
          Shows
        </Button>
      </Group>

      <Table className="schedule-table" verticalSpacing="sm">
        <Table.Tbody>
          <Table.Tr>
            <Table.Th w={150}>Sources</Table.Th>
            <Table.Td>{show.organizations.join(", ") || "Unknown"}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Genres</Table.Th>
            <Table.Td>{show.genres.join(", ") || "Unknown"}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Languages</Table.Th>
            <Table.Td>
              <Group gap={4}>
                {show.languages.length === 0 && <Text>Unknown</Text>}
                {show.languages.map((language) => (
                  <Badge key={`${show.id}-${language}`} size="xs" variant="light">
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
                {show.countries.length === 0 && <Text>Unknown</Text>}
                {show.countries.map((country) => (
                  <Badge key={`${show.id}-${country}`} size="xs" variant="light">
                    {country}
                  </Badge>
                ))}
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      <Stack gap="sm">
        <Title order={2}>Seasons</Title>
        <ScrollArea>
          <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={820}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={120}>Season</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>When</Table.Th>
                <Table.Th w={140}>Lang</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th>Genre</Table.Th>
                <Table.Th w={120}>Episodes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {show.seasons.map((season) => (
                <Table.Tr key={season.id}>
                  <Table.Td>
                    <Anchor href={`/manage/show/${show.id}/season/${season.id}`}>{season.seasonLabel}</Anchor>
                  </Table.Td>
                  <Table.Td>{season.section === "past" ? season.endedReason : sectionLabels[season.section]}</Table.Td>
                  <Table.Td>{season.timing}</Table.Td>
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
                  <Table.Td>{season.organizationText}</Table.Td>
                  <Table.Td>{season.genreText}</Table.Td>
                  <Table.Td>Unknown</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Stack>
  );
}

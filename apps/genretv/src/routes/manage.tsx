import { Anchor, Badge, Group, ScrollArea, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useMemo, useState } from "react";

import { canonicalSchedule } from "../domain/canonical-schedule";
import { buildManagementShows, filterManagementShows, scheduleFilterOptions } from "../domain/schedule";

const shows = buildManagementShows(canonicalSchedule.entries);
const filterOptions = scheduleFilterOptions(canonicalSchedule.entries);

export function ManageRoute() {
  const [query, setQuery] = useState("");
  const [organization, setOrganization] = useState("all");
  const [language, setLanguage] = useState("all");
  const visibleShows = useMemo(
    () => filterManagementShows(shows, query, organization, language),
    [query, organization, language],
  );

  return (
    <Stack className="schedule-panel" gap="lg" maw={1220} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Shows</Title>
          <Text size="sm" c="dimmed">
            {visibleShows.length} of {shows.length}
          </Text>
        </div>
      </Group>

      <Group className="schedule-controls" align="flex-end" gap="sm">
        <TextInput
          className="schedule-search"
          label="Search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <Select
          label="Language"
          value={language}
          data={[
            { value: "all", label: "All languages" },
            ...filterOptions.languages.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => setLanguage(value ?? "all")}
        />
        <Select
          label="Source"
          value={organization}
          searchable
          data={[
            { value: "all", label: "All sources" },
            ...filterOptions.organizations.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => setOrganization(value ?? "all")}
        />
      </Group>

      <ScrollArea>
        <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={880}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Show</Table.Th>
              <Table.Th w={120}>Seasons</Table.Th>
              <Table.Th>Sources</Table.Th>
              <Table.Th>Genre</Table.Th>
              <Table.Th>Languages</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleShows.map((show) => (
              <Table.Tr key={show.id}>
                <Table.Td>
                  <Anchor href={`/manage/show/${show.id}`} fw={700}>
                    {show.title}
                  </Anchor>
                </Table.Td>
                <Table.Td>{show.seasons.length}</Table.Td>
                <Table.Td>{show.organizations.join(", ")}</Table.Td>
                <Table.Td>{show.genres.join(", ")}</Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    {show.languages.map((language) => (
                      <Badge key={`${show.id}-${language}`} size="xs" variant="light">
                        {language}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}

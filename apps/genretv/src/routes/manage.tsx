import { Anchor, Badge, Group, Pagination, ScrollArea, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import { canonicalSchedule } from "../domain/canonical-schedule";
import {
  buildManagementShows,
  defaultPageSize,
  filterManagementShows,
  pageCountFor,
  paginateItems,
  pageSizeOptions,
  scheduleFilterOptions,
  type PageSize,
} from "../domain/schedule";

const shows = buildManagementShows(canonicalSchedule.entries);
const filterOptions = scheduleFilterOptions(canonicalSchedule.entries);

export function ManageRoute() {
  const [query, setQuery] = useState("");
  const [organization, setOrganization] = useState("all");
  const [language, setLanguage] = useState("all");
  const [pageSize, setPageSize] = useState<PageSize>(defaultPageSize);
  const [page, setPage] = useState(1);
  const visibleShows = useMemo(
    () => filterManagementShows(shows, query, organization, language),
    [query, organization, language],
  );
  const totalPages = pageCountFor(visibleShows.length, pageSize);
  const pageShows = useMemo(() => paginateItems(visibleShows, page, pageSize), [page, pageSize, visibleShows]);

  const resetToFirstPage = () => setPage(1);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

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
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            resetToFirstPage();
          }}
        />
        <Select
          label="Language"
          value={language}
          data={[
            { value: "all", label: "All languages" },
            ...filterOptions.languages.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setLanguage(value ?? "all");
            resetToFirstPage();
          }}
        />
        <Select
          label="Source"
          value={organization}
          searchable
          data={[
            { value: "all", label: "All sources" },
            ...filterOptions.organizations.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => {
            setOrganization(value ?? "all");
            resetToFirstPage();
          }}
        />
        <Select
          label="Rows"
          value={String(pageSize)}
          data={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
          onChange={(value) => {
            setPageSize(parsePageSize(value));
            resetToFirstPage();
          }}
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
              <Table.Th>Lang</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageShows.map((show) => (
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

      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Page {page} of {totalPages}
        </Text>
        <Pagination value={page} total={totalPages} onChange={setPage} />
      </Group>
    </Stack>
  );
}

function parsePageSize(value: unknown): PageSize {
  const parsed = Number(value);
  return pageSizeOptions.includes(parsed as PageSize) ? (parsed as PageSize) : defaultPageSize;
}

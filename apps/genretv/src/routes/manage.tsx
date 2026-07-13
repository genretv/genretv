import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CheckboxFilter } from "../components/checkbox-filter";
import { useManagementShows } from "../domain/live-management-shows";
import {
  defaultPageSize,
  defaultManagementViewPreferences,
  filterManagementShows,
  findImdbLink,
  formatKnownSeasonCount,
  pageCountFor,
  paginateItems,
  pageSizeOptions,
  scheduleFilterOptions,
  type ManagementSort,
  type ManagementViewPreferences,
  type PageSize,
} from "../domain/schedule";
import { ManagementEditRow } from "../features/management/editor-ui";

const storageKey = "genretv.management.view.v1";

export function ManageRoute() {
  const navigate = useNavigate();
  const { error, loading, schedule, shows } = useManagementShows();
  const filterOptions = useMemo(() => scheduleFilterOptions(schedule.entries), [schedule.entries]);
  const [preferences, setPreferences] = useStoredManagementViewPreferences();
  const [page, setPage] = useState(1);
  const visibleShows = useMemo(() => filterManagementShows(shows, preferences), [preferences, shows]);
  const knownSeasonTotal = useMemo(() => shows.reduce((total, show) => total + show.knownSeasonCount, 0), [shows]);
  const listedSeasonTotal = useMemo(() => shows.reduce((total, show) => total + show.listedSeasonCount, 0), [shows]);
  const totalPages = pageCountFor(visibleShows.length, preferences.pageSize);
  const pageShows = useMemo(
    () => paginateItems(visibleShows, page, preferences.pageSize),
    [page, preferences.pageSize, visibleShows],
  );

  const updatePreferences = (patch: Partial<ManagementViewPreferences>) => {
    setPage(1);
    setPreferences((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  if (loading) {
    return (
      <Stack className="schedule-panel" gap="lg" maw={1220} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Shows</Title>
        {error == null ? (
          <Alert color="blue" variant="light">
            Loading show management...
          </Alert>
        ) : (
          <Alert color="red" variant="light">
            Could not load show management: {error.message}
          </Alert>
        )}
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={1220} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>Shows</Title>
          <Text size="sm" c="dimmed">
            {visibleShows.length} of {shows.length}
          </Text>
          <Group gap={6} mt={6}>
            <Badge variant="light">{shows.length} shows</Badge>
            <Badge variant="light">{knownSeasonTotal} known seasons</Badge>
            <Badge variant="outline">{listedSeasonTotal} listed rows</Badge>
          </Group>
        </div>
        <Group>
          <Button component={Link} to="/manage/hidden" variant="default">
            Hidden rows
          </Button>
          <Button onClick={() => void navigate({ to: "/manage/show/$showId", params: { showId: "new" } })}>
            Add show
          </Button>
        </Group>
      </Group>

      {error != null && (
        <Alert color="red" variant="light">
          Could not load show management: {error.message}
        </Alert>
      )}
      <Group className="schedule-controls" align="flex-end" gap="sm">
        <TextInput
          className="schedule-search"
          label="Search"
          value={preferences.query}
          onChange={(event) => updatePreferences({ query: event.currentTarget.value })}
        />
        <CheckboxFilter
          label="Language"
          options={filterOptions.languages}
          selected={preferences.languages}
          onChange={(languages) => updatePreferences({ languages })}
        />
        <CheckboxFilter
          label="Country"
          options={filterOptions.countries}
          selected={preferences.countries}
          onChange={(countries) => updatePreferences({ countries })}
        />
        <Select
          label="Source"
          value={preferences.organization}
          searchable
          data={[
            { value: "all", label: "All sources" },
            ...filterOptions.organizations.map((value) => ({ value, label: value })),
          ]}
          onChange={(value) => updatePreferences({ organization: value ?? "all" })}
        />
        <Select
          label="Sort"
          value={preferences.sort}
          data={[
            { value: "title", label: "Title" },
            { value: "seasonCount", label: "Known seasons" },
            { value: "organization", label: "Source" },
          ]}
          onChange={(value) => updatePreferences({ sort: parseManagementSort(value) })}
        />
      </Group>

      <ScrollArea>
        <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={880}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Show</Table.Th>
              <Table.Th w={150}>Known seasons</Table.Th>
              <Table.Th>Sources</Table.Th>
              <Table.Th>Genre</Table.Th>
              <Table.Th>Lang</Table.Th>
              <Table.Th w={90}>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageShows.map((show) => {
              const imdbLink = findImdbLink(show.links);
              const editShow = () => void navigate({ to: "/manage/show/$showId", params: { showId: show.id } });
              return (
                <ManagementEditRow key={show.id} editLabel={`Edit ${show.title}`} onEdit={editShow}>
                  <Table.Td data-management-row-title>
                    {imdbLink == null ? (
                      <Text fw={700}>{show.title}</Text>
                    ) : (
                      <Anchor fw={700} href={imdbLink.url} target="_blank" rel="noopener noreferrer">
                        {show.title}
                      </Anchor>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text fw={700}>{formatKnownSeasonCount(show)}</Text>
                    {show.knownSeasonCount > show.listedSeasonCount && (
                      <Text size="xs" c="dimmed">
                        {show.listedSeasonCount} listed {show.listedSeasonCount === 1 ? "row" : "rows"}
                      </Text>
                    )}
                  </Table.Td>
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
                  <Table.Td>
                    <Button aria-label={`Edit ${show.title}`} size="xs" variant="default" onClick={editShow}>
                      Edit
                    </Button>
                  </Table.Td>
                </ManagementEditRow>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Page {page} of {totalPages} · {visibleShows.length} rows
        </Text>
        <Group className="pager-controls" gap="sm" align="flex-end">
          <Select
            className="page-size-select"
            label="Rows"
            value={String(preferences.pageSize)}
            data={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => updatePreferences({ pageSize: parsePageSize(value) })}
          />
          <Pagination value={page} total={totalPages} onChange={setPage} />
        </Group>
      </Group>
    </Stack>
  );
}

function useStoredManagementViewPreferences() {
  const [preferences, setPreferences] = useState<ManagementViewPreferences>(readStoredPreferences);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences]);

  return [preferences, setPreferences] as const;
}

function readStoredPreferences(): ManagementViewPreferences {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw == null) return defaultManagementViewPreferences;
    const parsed = JSON.parse(raw) as Partial<ManagementViewPreferences> & { language?: unknown };
    return {
      query: typeof parsed.query === "string" ? parsed.query : defaultManagementViewPreferences.query,
      organization:
        typeof parsed.organization === "string" ? parsed.organization : defaultManagementViewPreferences.organization,
      languages: parseStringArray(parsed.languages, parsed.language),
      countries: parseStringArray(parsed.countries),
      sort: parseManagementSort(parsed.sort),
      pageSize: parsePageSize(parsed.pageSize),
    };
  } catch {
    return defaultManagementViewPreferences;
  }
}

function parseManagementSort(value: unknown): ManagementSort {
  return value === "title" || value === "seasonCount" || value === "organization"
    ? value
    : defaultManagementViewPreferences.sort;
}

function parseStringArray(value: unknown, legacySingleValue?: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof legacySingleValue === "string" && legacySingleValue !== "all") return [legacySingleValue];
  return [];
}

function parsePageSize(value: unknown): PageSize {
  const parsed = Number(value);
  return pageSizeOptions.includes(parsed as PageSize) ? (parsed as PageSize) : defaultPageSize;
}

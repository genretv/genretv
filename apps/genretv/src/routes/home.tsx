import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Group,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Fragment, useEffect, useMemo, useState } from "react";

import { CheckboxFilter } from "../components/checkbox-filter";
import { useCanonicalSchedule } from "../domain/live-canonical-schedule";
import {
  defaultScheduleViewPreferences,
  filterScheduleEntries,
  formatEpisodeCount,
  pageCountFor,
  paginateItems,
  pageSizeOptions,
  scheduleFilterOptions,
  sectionLabels,
  type EndingFilter,
  type PageSize,
  type ScheduleEntry,
  type ScheduleSection,
  type ScheduleSort,
  type ScheduleViewPreferences,
} from "../domain/schedule";

const storageKey = "genretv.schedule.view.v1";

function SectionTable({ entries, section }: { entries: ScheduleEntry[]; section: ScheduleSection }) {
  const showStopReason = section === "past";
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const columnCount = showStopReason ? 8 : 7;
  const toggleExpanded = (entryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };
  return (
    <ScrollArea>
      <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={showStopReason ? 1100 : 980}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={44}></Table.Th>
            <Table.Th>Show</Table.Th>
            <Table.Th w={120}>Season</Table.Th>
            <Table.Th>When</Table.Th>
            {showStopReason && <Table.Th w={130}>Ended</Table.Th>}
            <Table.Th w={140}>Lang</Table.Th>
            <Table.Th>Where</Table.Th>
            <Table.Th>Genre</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((entry) => {
            const expanded = expandedIds.has(entry.id);
            return (
              <Fragment key={entry.id}>
                <Table.Tr>
                  <Table.Td>
                    <ActionIcon
                      aria-label={`${expanded ? "Hide" : "Show"} details for ${entry.title}`}
                      size="sm"
                      variant="subtle"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      {expanded ? "-" : "+"}
                    </ActionIcon>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600}>{entry.title}</Text>
                  </Table.Td>
                  <Table.Td>{entry.seasonLabel}</Table.Td>
                  <Table.Td>{entry.timing}</Table.Td>
                  {showStopReason && <Table.Td>{entry.endedReason}</Table.Td>}
                  <Table.Td>
                    <LanguageBadges languages={entry.languages} ownerId={entry.id} />
                  </Table.Td>
                  <Table.Td>{entry.organizationText}</Table.Td>
                  <Table.Td>{entry.genreText}</Table.Td>
                </Table.Tr>
                {expanded && (
                  <Table.Tr>
                    <Table.Td></Table.Td>
                    <Table.Td colSpan={columnCount - 1}>
                      <ScheduleEntryDetails entry={entry} />
                    </Table.Td>
                  </Table.Tr>
                )}
              </Fragment>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

function ScheduleEntryDetails({ entry }: { entry: ScheduleEntry }) {
  return (
    <Box py="xs">
      <Stack gap={8}>
        {entry.links.length > 0 && (
          <Group gap={8}>
            {entry.links.map((link) => (
              <Anchor key={`${entry.id}-${link.kind}-${link.url}`} href={link.url} target="_blank" size="sm">
                {link.kind ?? link.label}
              </Anchor>
            ))}
          </Group>
        )}
        {entry.seasonNotes != null && (
          <Text size="sm" c="dimmed">
            {entry.seasonNotes}
          </Text>
        )}
        {entry.legacyCells.length > 0 && (
          <Text size="xs" c="dimmed">
            Legacy cells: {entry.legacyCells.join(" | ")}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Episodes: {formatEpisodeCount(entry.episodeCount, entry.episodes)}
        </Text>
        {entry.episodes.map((episode) => (
          <Text key={episode.id} size="xs" c="dimmed">
            {[episode.episodeLabel, episode.title, episode.releaseDate].filter(Boolean).join(" · ")}
          </Text>
        ))}
      </Stack>
    </Box>
  );
}

function LanguageBadges({ languages, ownerId }: { languages: readonly string[]; ownerId: string }) {
  if (languages.length === 0) return <Text>Unknown</Text>;
  return (
    <Group gap={4}>
      {languages.map((language) => (
        <Badge key={`${ownerId}-${language}`} size="xs" variant="light">
          {language}
        </Badge>
      ))}
    </Group>
  );
}

export function HomeRoute() {
  const { schedule } = useCanonicalSchedule();
  const [preferences, setPreferences] = useStoredScheduleViewPreferences();
  const [page, setPage] = useState(1);
  const filterOptions = useMemo(() => scheduleFilterOptions(schedule.entries), [schedule.entries]);
  const visibleEntries = useMemo(
    () => filterScheduleEntries(schedule.entries, preferences),
    [preferences, schedule.entries],
  );
  const totalPages = pageCountFor(visibleEntries.length, preferences.pageSize);
  const pageEntries = useMemo(
    () => paginateItems(visibleEntries, page, preferences.pageSize),
    [page, preferences.pageSize, visibleEntries],
  );

  const updatePreferences = (patch: Partial<ScheduleViewPreferences>) => {
    setPage(1);
    setPreferences((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <Stack className="schedule-panel" gap="lg" maw={1220} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>{schedule.title}</Title>
          <Text size="sm" c="dimmed">
            Canonical seed scraped from {schedule.sourceUrl}. {schedule.updatedLabel}
          </Text>
        </div>
      </Group>

      <Tabs
        value={preferences.section}
        onChange={(value) => updatePreferences({ section: parseSection(value), ending: "all" })}
      >
        <Tabs.List>
          {(["current", "upcoming", "past"] as const).map((value) => (
            <Tabs.Tab key={value} value={value}>
              {sectionLabels[value]} ({schedule.counts[value]})
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

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
            ...filterOptions.organizations.map((organization) => ({ value: organization, label: organization })),
          ]}
          onChange={(value) => updatePreferences({ organization: value ?? "all" })}
        />
        <Select
          label="Sort"
          value={preferences.sort}
          data={[
            { value: "source", label: "Original order" },
            { value: "title", label: "Title" },
            { value: "organization", label: "Source" },
          ]}
          onChange={(value) => updatePreferences({ sort: parseSort(value) })}
        />
        {preferences.section === "past" && (
          <SegmentedControl
            classNames={{
              control: "ending-filter-control",
              indicator: "ending-filter-indicator",
              label: "ending-filter-label",
              root: "ending-filter",
            }}
            value={preferences.ending}
            data={[
              { value: "all", label: "All" },
              { value: "canceled", label: "Canceled" },
              { value: "finished", label: "Finished" },
            ]}
            onChange={(value) => updatePreferences({ ending: parseEnding(value) })}
          />
        )}
      </Group>

      <SectionTable entries={pageEntries} section={preferences.section} />

      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          Page {page} of {totalPages} · {visibleEntries.length} rows
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

function useStoredScheduleViewPreferences() {
  const [preferences, setPreferences] = useState<ScheduleViewPreferences>(readStoredPreferences);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences]);

  return [preferences, setPreferences] as const;
}

function readStoredPreferences(): ScheduleViewPreferences {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw == null) return defaultScheduleViewPreferences;
    const parsed = JSON.parse(raw) as Partial<ScheduleViewPreferences> & { language?: unknown };
    return {
      section: parseSection(parsed.section),
      query: typeof parsed.query === "string" ? parsed.query : defaultScheduleViewPreferences.query,
      languages: parseStringArray(parsed.languages, parsed.language),
      countries: parseStringArray(parsed.countries),
      organization:
        typeof parsed.organization === "string" ? parsed.organization : defaultScheduleViewPreferences.organization,
      ending: parseEnding(parsed.ending),
      sort: parseSort(parsed.sort),
      pageSize: parsePageSize(parsed.pageSize),
    };
  } catch {
    return defaultScheduleViewPreferences;
  }
}

function parseSection(value: unknown): ScheduleSection {
  return value === "current" || value === "upcoming" || value === "past"
    ? value
    : defaultScheduleViewPreferences.section;
}

function parseEnding(value: unknown): EndingFilter {
  return value === "all" || value === "canceled" || value === "finished" || value === "unknown"
    ? value
    : defaultScheduleViewPreferences.ending;
}

function parseSort(value: unknown): ScheduleSort {
  return value === "source" || value === "title" || value === "organization"
    ? value
    : defaultScheduleViewPreferences.sort;
}

function parseStringArray(value: unknown, legacySingleValue?: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof legacySingleValue === "string" && legacySingleValue !== "all") return [legacySingleValue];
  return [];
}

function parsePageSize(value: unknown): PageSize {
  const parsed = Number(value);
  return pageSizeOptions.includes(parsed as PageSize) ? (parsed as PageSize) : defaultScheduleViewPreferences.pageSize;
}

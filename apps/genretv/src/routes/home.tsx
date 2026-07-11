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
  defaultScheduleSortDirection,
  filterScheduleEntries,
  findImdbLink,
  findOrganizationLink,
  formatEpisodeCount,
  formatScheduleSeasonCount,
  formatScheduleStatus,
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
  type ScheduleSortDirection,
  type ScheduleViewPreferences,
} from "../domain/schedule";

const storageKey = "genretv.schedule.view.v1";

interface SectionTableProps {
  entries: ScheduleEntry[];
  onGenreFilter: (genre: string) => void;
  onSort: (sort: ScheduleSort) => void;
  section: ScheduleSection;
  sort: ScheduleSort;
  sortDirection: ScheduleSortDirection;
}

function SectionTable({ entries, onGenreFilter, onSort, section, sort, sortDirection }: SectionTableProps) {
  const showStopReason = section === "waiting" || section === "past";
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
    <ScrollArea className="schedule-list-scroll">
      <Table
        className="schedule-table schedule-list-table"
        striped
        highlightOnHover
        verticalSpacing="sm"
        miw={{ base: 0, sm: showStopReason ? 1100 : 980 }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th className="schedule-col-toggle" w={44}></Table.Th>
            <SortableTableHeader
              className="schedule-col-title"
              label="Show"
              value="title"
              activeSort={sort}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              className="schedule-col-secondary"
              label="Seasons"
              value="seasons"
              activeSort={sort}
              direction={sortDirection}
              onSort={onSort}
              width={120}
            />
            <SortableTableHeader
              className="schedule-col-when"
              label="When"
              value="when"
              activeSort={sort}
              direction={sortDirection}
              onSort={onSort}
            />
            {showStopReason && (
              <SortableTableHeader
                className="schedule-col-secondary"
                label="Ended"
                value="ending"
                activeSort={sort}
                direction={sortDirection}
                onSort={onSort}
                width={130}
              />
            )}
            <SortableTableHeader
              className="schedule-col-secondary"
              label="Lang"
              value="language"
              activeSort={sort}
              direction={sortDirection}
              onSort={onSort}
              width={140}
            />
            <SortableTableHeader
              className="schedule-col-secondary"
              label="Where"
              value="organization"
              activeSort={sort}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortableTableHeader
              className="schedule-col-secondary"
              label="Genre"
              value="genre"
              activeSort={sort}
              direction={sortDirection}
              onSort={onSort}
            />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((entry) => {
            const expanded = expandedIds.has(entry.id);
            const imdbLink = findImdbLink(entry.showLinks);
            return (
              <Fragment key={entry.id}>
                <Table.Tr className="schedule-entry-row">
                  <Table.Td className="schedule-col-toggle">
                    <ActionIcon
                      aria-label={`${expanded ? "Hide" : "Show"} details for ${entry.title}`}
                      className="schedule-details-toggle"
                      size="sm"
                      variant="default"
                      onClick={() => toggleExpanded(entry.id)}
                    >
                      {expanded ? "-" : "+"}
                    </ActionIcon>
                  </Table.Td>
                  <Table.Td className="schedule-col-title">
                    {imdbLink == null ? (
                      <Text fw={600}>{entry.title}</Text>
                    ) : (
                      <Anchor fw={600} href={imdbLink.url} target="_blank" rel="noopener noreferrer">
                        {entry.title}
                      </Anchor>
                    )}
                  </Table.Td>
                  <Table.Td className="schedule-col-secondary">{formatScheduleSeasonCount(entry)}</Table.Td>
                  <Table.Td className="schedule-col-when">{entry.timing}</Table.Td>
                  {showStopReason && (
                    <Table.Td className="schedule-col-secondary">
                      {formatScheduleStatus(entry.section, entry.endedReason, entry.isFinal)}
                    </Table.Td>
                  )}
                  <Table.Td className="schedule-col-secondary">
                    <LanguageBadges languages={entry.languages} ownerId={entry.id} />
                  </Table.Td>
                  <Table.Td className="schedule-col-secondary">
                    <OrganizationLinks entry={entry} />
                  </Table.Td>
                  <Table.Td className="schedule-col-secondary">
                    <GenreLinks entry={entry} onFilter={onGenreFilter} />
                  </Table.Td>
                </Table.Tr>
                {expanded && (
                  <Table.Tr className="schedule-details-row">
                    <Table.Td className="schedule-col-toggle"></Table.Td>
                    <Table.Td className="schedule-details-cell" colSpan={columnCount - 1}>
                      <ScheduleEntryDetails entry={entry} onGenreFilter={onGenreFilter} />
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

function SortableTableHeader({
  activeSort,
  className,
  direction,
  label,
  onSort,
  value,
  width,
}: {
  activeSort: ScheduleSort;
  className?: string;
  direction: ScheduleSortDirection;
  label: string;
  onSort: (sort: ScheduleSort) => void;
  value: ScheduleSort;
  width?: number;
}) {
  const active = activeSort === value;
  return (
    <Table.Th aria-sort={active ? direction : "none"} className={className} w={width}>
      <button
        aria-label={`Sort by ${label}${active ? `, currently ${direction}` : ""}`}
        className="schedule-sort-button"
        type="button"
        onClick={() => onSort(value)}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="schedule-sort-indicator"
          data-active={active || undefined}
          data-direction={active ? direction : undefined}
        />
      </button>
    </Table.Th>
  );
}

function ScheduleEntryDetails({
  entry,
  onGenreFilter,
}: {
  entry: ScheduleEntry;
  onGenreFilter: (genre: string) => void;
}) {
  const imdbLink = findImdbLink(entry.showLinks);
  const primaryLinkUrls = new Set(
    entry.organizations
      .map((organization) => findOrganizationLink(organization, entry.seasonLinks, entry.organizations.length)?.url)
      .filter((url): url is string => url != null),
  );
  if (imdbLink != null) primaryLinkUrls.add(imdbLink.url);
  const detailLinks = entry.links.filter((link) => !primaryLinkUrls.has(link.url));
  return (
    <Box py="xs">
      <Stack gap={8}>
        <MobileScheduleMetadata entry={entry} onGenreFilter={onGenreFilter} />
        {detailLinks.length > 0 && (
          <Group gap={8}>
            {detailLinks.map((link) => (
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
          <Group key={episode.id} gap={8}>
            <Text size="xs" c="dimmed">
              {[episode.episodeLabel, episode.title, episode.releaseDate].filter(Boolean).join(" · ")}
            </Text>
            {episode.links.map((link) => (
              <Anchor key={`${episode.id}-${link.kind}-${link.url}`} href={link.url} target="_blank" size="xs">
                {link.kind ?? link.label}
              </Anchor>
            ))}
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

function MobileScheduleMetadata({
  entry,
  onGenreFilter,
}: {
  entry: ScheduleEntry;
  onGenreFilter: (genre: string) => void;
}) {
  const showStopReason = entry.section === "waiting" || entry.section === "past";
  return (
    <Box className="schedule-mobile-details" component="dl">
      <div>
        <Text component="dt">Seasons</Text>
        <Box component="dd">{formatScheduleSeasonCount(entry)}</Box>
      </div>
      {showStopReason && (
        <div>
          <Text component="dt">Ended</Text>
          <Box component="dd">{formatScheduleStatus(entry.section, entry.endedReason, entry.isFinal)}</Box>
        </div>
      )}
      <div>
        <Text component="dt">Language</Text>
        <Box component="dd">
          <LanguageBadges languages={entry.languages} ownerId={`${entry.id}-mobile`} />
        </Box>
      </div>
      <div>
        <Text component="dt">Where</Text>
        <Box component="dd">
          <OrganizationLinks entry={entry} />
        </Box>
      </div>
      <div>
        <Text component="dt">Genre</Text>
        <Box component="dd">
          <GenreLinks entry={entry} onFilter={onGenreFilter} />
        </Box>
      </div>
    </Box>
  );
}

function OrganizationLinks({ entry }: { entry: ScheduleEntry }) {
  if (entry.organizations.length === 0) return entry.organizationText;
  return entry.organizations.map((organization, index) => {
    const link = findOrganizationLink(organization, entry.seasonLinks, entry.organizations.length);
    return (
      <Fragment key={`${entry.id}-${organization}`}>
        {index > 0 ? ", " : ""}
        {link == null ? (
          organization
        ) : (
          <Anchor href={link.url} target="_blank" rel="noopener noreferrer">
            {organization}
          </Anchor>
        )}
      </Fragment>
    );
  });
}

function GenreLinks({ entry, onFilter }: { entry: ScheduleEntry; onFilter: (genre: string) => void }) {
  if (entry.genres.length === 0) return entry.genreText;
  return entry.genres.map((genre, index) => (
    <Fragment key={`${entry.id}-${genre}`}>
      {index > 0 ? ", " : ""}
      <Anchor className="inline-link-button" component="button" type="button" onClick={() => onFilter(genre)}>
        {genre}
      </Anchor>
    </Fragment>
  ));
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
  const filterOptions = useMemo(
    () => scheduleFilterOptions(schedule.entries.filter((entry) => entry.section === preferences.section)),
    [preferences.section, schedule.entries],
  );
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
  const updateSort = (sort: ScheduleSort) => {
    updatePreferences({
      sort,
      sortDirection:
        sort === preferences.sort
          ? preferences.sortDirection === "ascending"
            ? "descending"
            : "ascending"
          : defaultScheduleSortDirection(sort, preferences.section),
    });
  };

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <Stack className="schedule-panel schedule-home-panel" gap="lg" maw={1220} mx="auto" p={{ base: "xs", sm: "xl" }}>
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
        onChange={(value) => {
          const section = parseSection(value);
          const nextFilterOptions = scheduleFilterOptions(
            schedule.entries.filter((entry) => entry.section === section),
          );
          updatePreferences({
            section,
            ending: "all",
            languages: preferences.languages.filter((language) => nextFilterOptions.languages.includes(language)),
            countries: preferences.countries.filter((country) => nextFilterOptions.countries.includes(country)),
            genres: preferences.genres.filter((genre) => nextFilterOptions.genres.includes(genre)),
            organization: nextFilterOptions.organizations.includes(preferences.organization)
              ? preferences.organization
              : "all",
            sortDirection: defaultScheduleSortDirection(preferences.sort, section),
          });
        }}
      >
        <Tabs.List className="schedule-tabs">
          {(["current", "upcoming", "waiting", "past"] as const).map((value) => (
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
          label="Genre"
          options={filterOptions.genres}
          selected={preferences.genres}
          onChange={(genres) => updatePreferences({ genres })}
        />
        <Select
          label="Platform"
          value={preferences.organization}
          searchable
          data={[
            { value: "all", label: "All platforms" },
            ...filterOptions.organizations.map((organization) => ({ value: organization, label: organization })),
          ]}
          onChange={(value) => updatePreferences({ organization: value ?? "all" })}
        />
        <Select
          label="Sort"
          value={preferences.sort}
          data={[
            { value: "when", label: "When" },
            { value: "title", label: "Title" },
            { value: "seasons", label: "Seasons" },
            { value: "ending", label: "Ended" },
            { value: "language", label: "Language" },
            { value: "organization", label: "Platform" },
            { value: "genre", label: "Genre" },
          ]}
          onChange={(value) => {
            const sort = parseSort(value);
            updatePreferences({ sort, sortDirection: defaultScheduleSortDirection(sort, preferences.section) });
          }}
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

      <SectionTable
        entries={pageEntries}
        onGenreFilter={(genre) => updatePreferences({ genres: [genre] })}
        section={preferences.section}
        sort={preferences.sort}
        sortDirection={preferences.sortDirection}
        onSort={updateSort}
      />

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
    const section = parseSection(parsed.section);
    const sort = parseSort(parsed.sort);
    return {
      section,
      query: typeof parsed.query === "string" ? parsed.query : defaultScheduleViewPreferences.query,
      languages: parseStringArray(parsed.languages, parsed.language),
      countries: parseStringArray(parsed.countries),
      genres: parseStringArray(parsed.genres),
      organization:
        typeof parsed.organization === "string" ? parsed.organization : defaultScheduleViewPreferences.organization,
      ending: parseEnding(parsed.ending),
      sort,
      sortDirection: parseSortDirection(parsed.sortDirection, sort, section),
      pageSize: parsePageSize(parsed.pageSize),
    };
  } catch {
    return defaultScheduleViewPreferences;
  }
}

function parseSection(value: unknown): ScheduleSection {
  return value === "current" || value === "upcoming" || value === "waiting" || value === "past"
    ? value
    : defaultScheduleViewPreferences.section;
}

function parseEnding(value: unknown): EndingFilter {
  return value === "all" || value === "canceled" || value === "finished" || value === "unknown"
    ? value
    : defaultScheduleViewPreferences.ending;
}

function parseSort(value: unknown): ScheduleSort {
  return value === "when" ||
    value === "title" ||
    value === "seasons" ||
    value === "ending" ||
    value === "language" ||
    value === "organization" ||
    value === "genre"
    ? value
    : defaultScheduleViewPreferences.sort;
}

function parseSortDirection(value: unknown, sort: ScheduleSort, section: ScheduleSection): ScheduleSortDirection {
  return value === "ascending" || value === "descending" ? value : defaultScheduleSortDirection(sort, section);
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

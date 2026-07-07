import {
  Anchor,
  Badge,
  Box,
  Group,
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
import { useEffect, useMemo, useState } from "react";

import seedJson from "../../seeds/blogspot-canonical.seed.json";
import {
  buildScheduleFromSeed,
  defaultScheduleViewPreferences,
  filterScheduleEntries,
  scheduleFilterOptions,
  sectionLabels,
  type BlogspotCanonicalSeed,
  type EndingFilter,
  type ScheduleEntry,
  type ScheduleSection,
  type ScheduleSort,
  type ScheduleViewPreferences,
} from "../domain/schedule";

const schedule = buildScheduleFromSeed(seedJson as unknown as BlogspotCanonicalSeed);
const storageKey = "genretv.schedule.view.v1";

function SectionTable({ entries, section }: { entries: ScheduleEntry[]; section: ScheduleSection }) {
  const showStopReason = section === "past";
  return (
    <ScrollArea>
      <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={showStopReason ? 980 : 860}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={44}></Table.Th>
            <Table.Th>Show</Table.Th>
            <Table.Th w={120}>Season</Table.Th>
            <Table.Th>When</Table.Th>
            {showStopReason && <Table.Th w={130}>Ended</Table.Th>}
            <Table.Th>Where</Table.Th>
            <Table.Th>Genre</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((entry) => (
            <Table.Tr key={entry.id}>
              <Table.Td>
                <details>
                  <summary aria-label={`Show details for ${entry.title}`}></summary>
                  <Box mt="xs" w={360}>
                    <Stack gap={6}>
                      <Group gap={6}>
                        {entry.links.map((link) => (
                          <Anchor key={`${entry.id}-${link.kind}-${link.url}`} href={link.url} target="_blank" size="sm">
                            {link.kind ?? link.label}
                          </Anchor>
                        ))}
                      </Group>
                      {entry.languages.length > 0 && (
                        <Group gap={4}>
                          {entry.languages.map((language) => (
                            <Badge key={`${entry.id}-${language}`} size="xs" variant="light">
                              {language}
                            </Badge>
                          ))}
                        </Group>
                      )}
                      <Text size="xs" c="dimmed">
                        Legacy cells: {entry.legacyCells.join(" | ")}
                      </Text>
                    </Stack>
                  </Box>
                </details>
              </Table.Td>
              <Table.Td>
                <Text fw={600}>{entry.title}</Text>
              </Table.Td>
              <Table.Td>{entry.seasonLabel}</Table.Td>
              <Table.Td>{entry.timing}</Table.Td>
              {showStopReason && <Table.Td>{entry.endedReason}</Table.Td>}
              <Table.Td>{entry.organizationText}</Table.Td>
              <Table.Td>{entry.genreText}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export function HomeRoute() {
  const [preferences, setPreferences] = useStoredScheduleViewPreferences();
  const filterOptions = useMemo(() => scheduleFilterOptions(schedule.entries), []);
  const visibleEntries = useMemo(() => filterScheduleEntries(schedule.entries, preferences), [preferences]);

  const updatePreferences = (patch: Partial<ScheduleViewPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  };

  return (
    <Stack
      className="schedule-panel"
      gap="lg"
      maw={1220}
      mx="auto"
      p={{ base: "md", sm: "xl" }}
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(20, 34, 36, 0.12)",
        boxShadow: "0 18px 60px rgba(10, 20, 22, 0.18)",
      }}
    >
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
        <Select
          label="Language"
          value={preferences.language}
          data={[
            { value: "all", label: "All languages" },
            ...filterOptions.languages.map((language) => ({ value: language, label: language })),
          ]}
          onChange={(value) => updatePreferences({ language: value ?? "all" })}
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
            value={preferences.ending}
            data={[
              { value: "all", label: "All" },
              { value: "canceled", label: "Canceled" },
              { value: "finished", label: "Finished" },
            ]}
            onChange={(value) => updatePreferences({ ending: parseEnding(value) })}
          />
        )}
        <Text size="sm" c="dimmed" ml="auto">
          {visibleEntries.length} rows
        </Text>
      </Group>

      <SectionTable entries={visibleEntries} section={preferences.section} />
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
    const parsed = JSON.parse(raw) as Partial<ScheduleViewPreferences>;
    return {
      section: parseSection(parsed.section),
      query: typeof parsed.query === "string" ? parsed.query : defaultScheduleViewPreferences.query,
      language: typeof parsed.language === "string" ? parsed.language : defaultScheduleViewPreferences.language,
      organization:
        typeof parsed.organization === "string" ? parsed.organization : defaultScheduleViewPreferences.organization,
      ending: parseEnding(parsed.ending),
      sort: parseSort(parsed.sort),
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

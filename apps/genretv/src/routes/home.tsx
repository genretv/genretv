import {
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";

import seedJson from "../../seeds/blogspot-canonical.seed.json";

type Section = "current" | "upcoming" | "past";

interface ExternalLinkSeed {
  kind?: string;
  label: string;
  url: string;
}

interface ReleaseWindowSeed {
  raw: string;
  precision: string;
  confidence: string;
  year: number | null;
  month: number | null;
  day: number | null;
  releaseSeason: string | null;
}

interface EntrySeed {
  id: string;
  section: Section;
  show: {
    displayTitle: string;
    externalLinks: ExternalLinkSeed[];
    languages: string[];
  };
  season: {
    rawSeason: string;
    labelKind: string;
    number?: number;
    tentative: boolean;
    extraMovie: boolean;
    hiatus: boolean;
    releasePattern: string | null;
    releaseWindow: ReleaseWindowSeed | null;
    finaleWindow: ReleaseWindowSeed | null;
    lifecycleMarkers: string[];
    legacyStatus: string;
    legacyTiming: string;
  };
  organizations: Array<{ name: string; role: string; externalLinks: ExternalLinkSeed[] }>;
  genreTags: string[];
  notes: string[];
  legacy: {
    genreText: string;
    organizationText: string;
    detailText: string;
    cells: string[];
  };
}

interface CanonicalSeed {
  generatedAt: string;
  source: {
    pageTitle: string;
    updatedLabel: string;
    url: string;
  };
  summary: {
    totalEntries: number;
    bySection: Record<Section, number>;
  };
  entries: EntrySeed[];
}

const seed = seedJson as unknown as CanonicalSeed;

const sectionLabels: Record<Section, string> = {
  current: "Now Showing",
  upcoming: "Upcoming",
  past: "Finished",
};

function formatWindow(window: ReleaseWindowSeed | null): string {
  if (window == null) return "";
  if (window.raw !== "") return window.raw;
  if (window.releaseSeason != null && window.year != null) return `${window.releaseSeason} ${window.year}`;
  if (window.year != null) return String(window.year);
  return "";
}

function timingFor(entry: EntrySeed): string {
  const release = formatWindow(entry.season.releaseWindow);
  const finale = formatWindow(entry.season.finaleWindow);
  if (entry.section === "current") {
    return [entry.season.legacyTiming, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  }
  if (entry.section === "upcoming") {
    return [release || entry.season.legacyTiming, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  }
  return entry.legacy.detailText || entry.season.legacyStatus || "past";
}

function seasonLabel(entry: EntrySeed): string {
  const prefix = entry.season.extraMovie ? "Movie" : `S${entry.season.rawSeason || "?"}`;
  return entry.season.tentative ? `${prefix}?` : prefix;
}

function organizationText(entry: EntrySeed): string {
  const names = entry.organizations.map((organization) => organization.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : entry.legacy.organizationText;
}

function SectionTable({ entries }: { entries: EntrySeed[] }) {
  return (
    <ScrollArea>
      <Table striped highlightOnHover verticalSpacing="sm" miw={860}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={44}></Table.Th>
            <Table.Th>Show</Table.Th>
            <Table.Th w={120}>Season</Table.Th>
            <Table.Th>When</Table.Th>
            <Table.Th>Where</Table.Th>
            <Table.Th>Genre</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((entry) => (
            <Table.Tr key={entry.id}>
              <Table.Td>
                <details>
                  <summary aria-label={`Show details for ${entry.show.displayTitle}`}></summary>
                  <Box mt="xs" w={360}>
                    <Stack gap={6}>
                      <Group gap={6}>
                        {entry.show.externalLinks.map((link) => (
                          <Anchor key={`${entry.id}-${link.kind}-${link.url}`} href={link.url} target="_blank" size="sm">
                            {link.kind ?? link.label}
                          </Anchor>
                        ))}
                      </Group>
                      {entry.show.languages.length > 0 && (
                        <Group gap={4}>
                          {entry.show.languages.map((language) => (
                            <Badge key={`${entry.id}-${language}`} size="xs" variant="light">
                              {language}
                            </Badge>
                          ))}
                        </Group>
                      )}
                      <Text size="xs" c="dimmed">
                        Legacy cells: {entry.legacy.cells.join(" | ")}
                      </Text>
                    </Stack>
                  </Box>
                </details>
              </Table.Td>
              <Table.Td>
                <Text fw={600}>{entry.show.displayTitle}</Text>
              </Table.Td>
              <Table.Td>{seasonLabel(entry)}</Table.Td>
              <Table.Td>{timingFor(entry)}</Table.Td>
              <Table.Td>{organizationText(entry)}</Table.Td>
              <Table.Td>{entry.genreTags.join(", ") || entry.legacy.genreText}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export function HomeRoute() {
  const [section, setSection] = useState<Section>("current");
  const entriesBySection = useMemo(
    () => ({
      current: seed.entries.filter((entry) => entry.section === "current"),
      upcoming: seed.entries.filter((entry) => entry.section === "upcoming"),
      past: seed.entries.filter((entry) => entry.section === "past"),
    }),
    [],
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1}>{seed.source.pageTitle}</Title>
          <Text size="sm" c="dimmed">
            Canonical seed scraped from {seed.source.url}. {seed.source.updatedLabel}
          </Text>
        </div>
        <Button component="a" href="/login" variant="default">
          Sign in to edit
        </Button>
      </Group>

      <Tabs value={section} onChange={(value) => setSection((value as Section | null) ?? "current")}>
        <Tabs.List>
          {(["current", "upcoming", "past"] as const).map((value) => (
            <Tabs.Tab key={value} value={value}>
              {sectionLabels[value]} ({entriesBySection[value].length})
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <SectionTable entries={entriesBySection[section]} />
    </Stack>
  );
}

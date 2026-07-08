import { Anchor, Badge, Button, Group, ScrollArea, Stack, Table, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import type { PublishedListSummary, PublishedSeasonSummary } from "./imports";
import type { ImportMode } from "./use-import-published-season";

interface PublishedListRowsTableProps {
  canImport: boolean;
  list: PublishedListSummary;
  onImportSeason: (season: PublishedSeasonSummary, importMode: ImportMode) => void;
  savingKey: string | null;
}

export function PublishedListRowsTable({ canImport, list, onImportSeason, savingKey }: PublishedListRowsTableProps) {
  return (
    <ScrollArea>
      <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={980}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Show</Table.Th>
            <Table.Th>Season</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Source</Table.Th>
            <Table.Th>Lang</Table.Th>
            <Table.Th>Import</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {list.seasons.map((season) => (
            <Table.Tr key={season.id}>
              <Table.Td>
                <Stack gap={2}>
                  <Text fw={700}>{season.displayTitle}</Text>
                  {season.externalLinks.length > 0 && (
                    <Group gap={6}>
                      {season.externalLinks.map((link) => (
                        <Anchor key={`${season.id}-${link.url}`} href={link.url} target="_blank" size="xs">
                          {link.kind ?? link.label}
                        </Anchor>
                      ))}
                    </Group>
                  )}
                </Stack>
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Text size="sm">{season.seasonLabel}</Text>
                  {season.seasonExternalLinks.length > 0 && (
                    <Group gap={6}>
                      {season.seasonExternalLinks.map((link) => (
                        <Anchor key={`${season.id}-season-${link.url}`} href={link.url} target="_blank" size="xs">
                          {link.kind ?? link.label}
                        </Anchor>
                      ))}
                    </Group>
                  )}
                </Stack>
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Text size="sm">{season.section === "past" ? season.endedReason : season.timing}</Text>
                  {season.releasePattern != null && (
                    <Text size="xs" c="dimmed">
                      {season.releasePattern}
                    </Text>
                  )}
                  {season.episodes.length > 0 && (
                    <Text size="xs" c="dimmed">
                      {season.episodes.length} episode rows
                    </Text>
                  )}
                </Stack>
              </Table.Td>
              <Table.Td>{season.organizationText || "Unknown"}</Table.Td>
              <Table.Td>
                <Group gap={4}>
                  {season.languages.map((language) => (
                    <Badge key={`${season.id}-${language}`} size="xs" variant="light">
                      {language}
                    </Badge>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                {season.importMode == null ? (
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      disabled={!canImport || savingKey != null}
                      loading={savingKey === `${season.id}:linked`}
                      onClick={() => {
                        onImportSeason(season, "linked");
                      }}
                    >
                      Link
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      disabled={!canImport || savingKey != null}
                      loading={savingKey === `${season.id}:detached`}
                      onClick={() => {
                        onImportSeason(season, "detached");
                      }}
                    >
                      Copy
                    </Button>
                  </Group>
                ) : (
                  <Badge color="teal" variant="light">
                    Imported: {season.importMode}
                  </Badge>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

export function PublisherAttribution({
  displayName,
  publicSlug,
}: {
  displayName: string | null;
  publicSlug: string | null;
}) {
  if (displayName == null) {
    return (
      <Text size="sm" c="dimmed" mt={4}>
        By a GenreTV publisher
      </Text>
    );
  }
  if (publicSlug == null) {
    return (
      <Text size="sm" c="dimmed" mt={4}>
        By {displayName}
      </Text>
    );
  }
  return (
    <Text size="sm" c="dimmed" mt={4}>
      By{" "}
      <Link className="inline-link-button" to="/profile/$slug" params={{ slug: publicSlug }}>
        {displayName}
      </Link>
    </Text>
  );
}

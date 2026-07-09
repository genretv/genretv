import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { Alert, Badge, Button, Group, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { formatMicrosecondTimestamp } from "../domain/time";

const publishedList = genretvSyncRegistry.published_list.view!;
const userProfile = genretvSyncRegistry.user_profile.view!;

export function PublicProfileRoute() {
  const { slug } = useParams({ from: "/profile/$slug" });
  const profiles = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          ownerId: userProfile.ownerId,
          displayName: userProfile.displayName,
          publicSlug: userProfile.publicSlug,
          bio: userProfile.bio,
          isPublic: userProfile.isPublic,
        })
        .from(userProfile),
    [],
  );
  const publishedLists = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishedList.id,
          ownerId: publishedList.ownerId,
          slug: publishedList.slug,
          title: publishedList.title,
          description: publishedList.description,
          publicationStatus: publishedList.publicationStatus,
          snapshotVersion: publishedList.snapshotVersion,
          updatedAtUs: publishedList.updatedAtUs,
        })
        .from(publishedList),
    [],
  );
  const profile = useMemo(
    () => profiles.rows.find((row) => row.isPublic && row.publicSlug === slug) ?? null,
    [profiles.rows, slug],
  );
  const profileLists = useMemo(
    () =>
      profile == null
        ? []
        : publishedLists.rows
            .filter((list) => list.ownerId === profile.ownerId && list.publicationStatus === "published")
            .sort((left, right) => left.title.localeCompare(right.title)),
    [profile, publishedLists.rows],
  );
  const loading = profiles.loading || publishedLists.loading;

  return (
    <Stack className="schedule-panel" gap="lg" maw={1040} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{profile?.displayName ?? "Public Profile"}</Title>
          <Text c="dimmed">@{slug}</Text>
        </div>
        <Button component={Link} to="/published" variant="default">
          Published lists
        </Button>
      </Group>

      {(profiles.error ?? publishedLists.error) != null && (
        <Alert color="red" variant="light">
          Could not load this public profile.
        </Alert>
      )}
      {loading && (
        <Alert color="blue" variant="light">
          Loading public profile...
        </Alert>
      )}
      {!loading && profile == null && (
        <Alert color="yellow" variant="light">
          No public profile exists for this slug.
        </Alert>
      )}
      {profile?.bio != null && profile.bio.trim() !== "" && <Text>{profile.bio}</Text>}

      {profile != null && (
        <Stack gap="sm">
          <Title order={2}>Published lists</Title>
          <ScrollArea>
            <Table className="schedule-table" striped verticalSpacing="sm" miw={720}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>List</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Version</Table.Th>
                  <Table.Th>Updated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {profileLists.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed">No published lists yet.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  profileLists.map((list) => (
                    <Table.Tr key={list.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Text fw={700}>{list.title}</Text>
                            <Badge variant="light">{list.slug}</Badge>
                          </Group>
                          {list.description != null && (
                            <Text size="sm" c="dimmed">
                              {list.description}
                            </Text>
                          )}
                          <Link className="inline-link-button" to="/published/$slug" params={{ slug: list.slug }}>
                            Browse rows
                          </Link>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{list.publicationStatus}</Badge>
                      </Table.Td>
                      <Table.Td>{list.snapshotVersion}</Table.Td>
                      <Table.Td>{formatMicroseconds(list.updatedAtUs)}</Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Stack>
      )}
    </Stack>
  );
}

const formatMicroseconds = formatMicrosecondTimestamp;

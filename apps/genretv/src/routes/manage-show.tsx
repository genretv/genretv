import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";

import { useAuth } from "../auth/auth";
import { canonicalSchedule } from "../domain/canonical-schedule";
import {
  buildManagementShows,
  findManagementShow,
  formatEpisodeCount,
  sectionLabels,
  type ManagementShow,
} from "../domain/schedule";
import {
  orderedTextToList,
  showDraftFromShow,
  showDraftStorageKey,
  useManagementDraft,
} from "../features/management/drafts";

const shows = buildManagementShows(canonicalSchedule.entries);

export function ManageShowRoute() {
  const { showId } = useParams({ from: "/manage/show/$showId" });
  const { session } = useAuth();
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

  return <EditableShow show={show} canEdit={session != null} />;
}

function EditableShow({ show, canEdit }: { show: ManagementShow; canEdit: boolean }) {
  const initialDraft = useMemo(() => showDraftFromShow(show), [show]);
  const { draft, dirty, locallySaved, setDraft, saveLocalDraft, discardLocalDraft } = useManagementDraft(
    showDraftStorageKey(show.id),
    initialDraft,
  );
  const draftLanguages = orderedTextToList(draft.languagesText);
  const draftCountries = orderedTextToList(draft.countriesText);
  const draftGenres = orderedTextToList(draft.genresText);

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

      <Alert color={canEdit ? "teal" : "yellow"} variant="light">
        {canEdit
          ? "Changes can be saved as a browser-local draft. Publishing to your overlay will be enabled when the writable pgxsinkit registry lands."
          : "Sign in to create a browser-local management draft."}
      </Alert>

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Display title"
            value={draft.title}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.currentTarget.value }))}
          />
          <TextInput
            label="Original title"
            value={draft.originalTitle}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, originalTitle: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Textarea
            label="Languages"
            autosize
            minRows={3}
            value={draft.languagesText}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, languagesText: event.currentTarget.value }))}
          />
          <Textarea
            label="Countries"
            autosize
            minRows={3}
            value={draft.countriesText}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, countriesText: event.currentTarget.value }))}
          />
          <Textarea
            label="Genres"
            autosize
            minRows={3}
            value={draft.genresText}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, genresText: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <Textarea
          label="Notes"
          autosize
          minRows={4}
          value={draft.notes}
          disabled={!canEdit}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
        />
        <Group justify="space-between" align="center">
          <Group gap={6}>
            {draftLanguages.map((language) => (
              <Badge key={`${show.id}-draft-language-${language}`} size="xs" variant="light">
                {language}
              </Badge>
            ))}
            {draftCountries.map((country) => (
              <Badge key={`${show.id}-draft-country-${country}`} size="xs" variant="outline">
                {country}
              </Badge>
            ))}
            {draftGenres.map((genre) => (
              <Badge key={`${show.id}-draft-genre-${genre}`} size="xs" color="gray" variant="light">
                {genre}
              </Badge>
            ))}
          </Group>
          <Group>
            <Button variant="default" disabled={!canEdit || !dirty} onClick={discardLocalDraft}>
              Discard
            </Button>
            <Button variant="light" disabled={!canEdit || !dirty} onClick={saveLocalDraft}>
              Save draft
            </Button>
            <Button disabled>Save to overlay</Button>
          </Group>
        </Group>
        {locallySaved && (
          <Text size="sm" c="dimmed">
            Local draft saved.
          </Text>
        )}
      </Stack>

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
                  <Table.Td>{formatEpisodeCount(season.episodeCount, season.episodes)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Stack>
  );
}

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
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
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { eq, or } from "drizzle-orm";
import { useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { useManagementShows } from "../domain/live-management-shows";
import { findManagementShow, formatEpisodeCount, sectionLabels, type ManagementShow } from "../domain/schedule";
import {
  orderedTextToList,
  showDraftFromShow,
  showDraftStorageKey,
  useManagementDraft,
} from "../features/management/drafts";
import { canSendCanonicalProposal } from "../features/management/proposals";

const personalShow = genretvSyncRegistry.personal_show.view!;
const newShowId = "new";

export function ManageShowRoute() {
  const { showId } = useParams({ from: "/manage/show/$showId" });
  const { roles, session } = useAuth();
  const { shows } = useManagementShows();
  const show = showId === newShowId ? emptyManagementShow() : findManagementShow(shows, showId);

  if (show == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Show not found</Title>
        <Button component={Link} to="/manage" variant="default">
          Back to shows
        </Button>
      </Stack>
    );
  }

  return <EditableShow show={show} canEdit={session != null} canPropose={canSendCanonicalProposal(roles)} />;
}

function EditableShow({ show, canEdit, canPropose }: { show: ManagementShow; canEdit: boolean; canPropose: boolean }) {
  const navigate = useNavigate();
  const client = useSyncClient();
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlaySaved, setOverlaySaved] = useState(false);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const personalShows = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalShow.id,
          canonicalShowId: personalShow.canonicalShowId,
          displayTitle: personalShow.displayTitle,
          originalTitle: personalShow.originalTitle,
          languages: personalShow.languages,
          countries: personalShow.countries,
          genreTags: personalShow.genreTags,
          externalLinks: personalShow.externalLinks,
          notes: personalShow.notes,
        })
        .from(personalShow)
        .where(or(eq(personalShow.id, show.id), eq(personalShow.canonicalShowId, show.id))),
    [show.id],
    { ready: canEdit },
  );
  const personalRow = personalShows.rows[0] ?? null;
  const initialDraft = useMemo(
    () => (personalRow == null ? showDraftFromShow(show) : showDraftFromPersonalRow(personalRow)),
    [personalRow, show],
  );
  const { draft, dirty, locallySaved, setDraft, saveLocalDraft, discardLocalDraft } = useManagementDraft(
    showDraftStorageKey(show.id),
    initialDraft,
  );
  const draftLanguages = orderedTextToList(draft.languagesText);
  const draftCountries = orderedTextToList(draft.countriesText);
  const draftGenres = orderedTextToList(draft.genresText);
  const canSaveOverlay = canEdit && !personalShows.loading && dirty && !savingOverlay;
  const canSubmitProposal = canEdit && canPropose && !personalShows.loading && !proposalSaving;

  const saveOverlay = async () => {
    const createdId = personalRow?.id ?? crypto.randomUUID();
    setSavingOverlay(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const patch = {
        displayTitle: draft.title.trim() || show.title,
        originalTitle: nullableText(draft.originalTitle),
        languages: draftLanguages,
        countries: draftCountries,
        genreTags: draftGenres,
        externalLinks: show.links,
        notes: nullableText(draft.notes),
      };
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (personalRow == null) {
          tx.tables.personal_show.create({
            id: createdId,
            canonicalShowId: show.id === newShowId ? null : show.id,
            ...patch,
          });
        } else {
          tx.tables.personal_show.update({ id: personalRow.id }, patch);
        }
      });
      setOverlaySaved(true);
      if (show.id === newShowId) {
        void navigate({ to: "/manage/show/$showId", params: { showId: createdId } });
      }
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingOverlay(false);
    }
  };

  const sendCanonicalProposal = async () => {
    const proposalId = crypto.randomUUID();
    const title = draft.title.trim() || show.title || "Untitled show";
    const isPersonalOnlyShow = personalRow != null && personalRow.canonicalShowId == null;
    setProposalSaving(true);
    setProposalError(null);
    setProposalSent(false);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.canonical_proposal.create({
          id: proposalId,
          proposalKind: "show",
          status: "open",
          title,
          message: nullableText(draft.notes),
          personalShowId: personalRow?.id ?? null,
          personalSeasonId: null,
          personalEpisodeId: null,
          canonicalShowId: show.id === newShowId || isPersonalOnlyShow ? null : show.id,
          canonicalSeasonId: null,
          canonicalEpisodeId: null,
          proposedPayload: {
            kind: "show",
            displayTitle: title,
            originalTitle: nullableText(draft.originalTitle),
            languages: draftLanguages,
            countries: draftCountries,
            genreTags: draftGenres,
            notes: nullableText(draft.notes),
          },
        });
        tx.tables.maintainer_notification.create({
          id: crypto.randomUUID(),
          notificationKind: "canonical_proposal",
          status: "unread",
          title: `Canonical proposal: ${title}`,
          body: nullableText(draft.notes),
          relatedPublishApplicationId: null,
          relatedCanonicalProposalId: proposalId,
        });
      });
      setProposalSent(true);
    } catch (cause) {
      setProposalError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProposalSaving(false);
    }
  };

  return (
    <Stack className="schedule-panel" gap="lg" maw={1040} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{show.id === newShowId ? "New show" : show.title}</Title>
          <Group gap={6} mt={6}>
            {show.links.map((link) => (
              <Anchor key={`${show.id}-${link.url}`} href={link.url} target="_blank" size="sm">
                {link.kind ?? link.label}
              </Anchor>
            ))}
          </Group>
        </div>
        <Group>
          <Button
            variant="light"
            disabled={!canEdit || show.id === newShowId}
            onClick={() =>
              void navigate({
                to: "/manage/show/$showId/season/$seasonId",
                params: { showId: show.id, seasonId: "new" },
              })
            }
          >
            Add season
          </Button>
          <Button component={Link} to="/manage" variant="default">
            Shows
          </Button>
        </Group>
      </Group>

      <Alert color={canEdit ? "teal" : "yellow"} variant="light">
        {canEdit
          ? "Save a browser-local draft while editing, or save this show-level metadata to your personal overlay."
          : "Sign in to create a browser-local management draft."}
      </Alert>
      {personalShows.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal overlay for this show: {personalShows.error.message}
        </Alert>
      )}
      {overlayError != null && (
        <Alert color="red" variant="light">
          Could not save to your overlay: {overlayError}
        </Alert>
      )}
      {overlaySaved && (
        <Alert color="teal" variant="light">
          Saved to your personal overlay.
        </Alert>
      )}
      {proposalError != null && (
        <Alert color="red" variant="light">
          Could not send canonical proposal: {proposalError}
        </Alert>
      )}
      {proposalSent && (
        <Alert color="teal" variant="light">
          Sent to the canonical maintainers.
        </Alert>
      )}

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
            <Button disabled={!canSaveOverlay} loading={savingOverlay} onClick={() => void saveOverlay()}>
              Save to overlay
            </Button>
            {canPropose && (
              <Button
                variant="light"
                disabled={!canSubmitProposal}
                loading={proposalSaving}
                onClick={() => void sendCanonicalProposal()}
              >
                Send to canonical
              </Button>
            )}
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
                    <Anchor
                      className="inline-link-button"
                      component="button"
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: "/manage/show/$showId/season/$seasonId",
                          params: { showId: show.id, seasonId: season.id },
                        })
                      }
                    >
                      {season.seasonLabel}
                    </Anchor>
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

function showDraftFromPersonalRow(row: {
  countries: unknown;
  displayTitle: string;
  genreTags: unknown;
  languages: unknown;
  notes: string | null;
  originalTitle: string | null;
}): ReturnType<typeof showDraftFromShow> {
  return {
    title: row.displayTitle,
    originalTitle: row.originalTitle ?? "",
    languagesText: orderedListToText(row.languages),
    countriesText: orderedListToText(row.countries),
    genresText: orderedListToText(row.genreTags),
    notes: row.notes ?? "",
  };
}

function emptyManagementShow(): ManagementShow {
  return {
    id: newShowId,
    title: "",
    originalTitle: null,
    languages: ["en"],
    organizations: [],
    genres: [],
    links: [],
    countries: [],
    notes: null,
    seasons: [],
  };
}

function orderedListToText(value: unknown): string {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join("\n") : "";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

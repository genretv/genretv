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
import { eq, inArray, or } from "drizzle-orm";
import { useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { useManagementShows } from "../domain/live-management-shows";
import { assertTransactionAcked } from "../domain/mutation-acks";
import { findManagementShow, formatEpisodeCount, sectionLabels, type ManagementShow } from "../domain/schedule";
import {
  externalLinkTextToRows,
  externalLinksToText,
  orderedTextToList,
  showDraftFromShow,
  showDraftStorageKey,
  useManagementDraft,
} from "../features/management/drafts";
import { canSendCanonicalProposal } from "../features/management/proposals";
import { isLinkedPublishedShowId } from "../features/publishing/linked-imports";
import { useSyncGroupsReady } from "../sync/use-sync-groups-ready";

const personalShow = genretvSyncRegistry.personal_show.view!;
const personalSeason = genretvSyncRegistry.personal_season.view!;
const personalEpisode = genretvSyncRegistry.personal_episode.view!;
const personalListExclusion = genretvSyncRegistry.personal_list_exclusion.view!;
const listImport = genretvSyncRegistry.list_import.view!;
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
  const [hidingShow, setHidingShow] = useState(false);
  const [deletingShow, setDeletingShow] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlaySaved, setOverlaySaved] = useState(false);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const personalOverlay = useSyncGroupsReady(client, canEdit, "personal_show");
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
  const isPersonalOnlyShow = personalRow != null && personalRow.canonicalShowId == null;
  const personalSeasonsForShow = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalSeason.id,
          personalShowId: personalSeason.personalShowId,
          canonicalShowId: personalSeason.canonicalShowId,
        })
        .from(personalSeason)
        .where(or(eq(personalSeason.personalShowId, show.id), eq(personalSeason.canonicalShowId, show.id))),
    [show.id],
    { ready: canEdit && personalRow != null },
  );
  const personalSeasonIds = useMemo(
    () => personalSeasonsForShow.rows.map((season) => season.id),
    [personalSeasonsForShow.rows],
  );
  const personalSeasonIdsKey = personalSeasonIds.join("\0");
  const personalEpisodesForShow = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalEpisode.id,
          personalSeasonId: personalEpisode.personalSeasonId,
        })
        .from(personalEpisode)
        .where(inArray(personalEpisode.personalSeasonId, personalSeasonIds)),
    [personalSeasonIdsKey],
    { ready: canEdit && isPersonalOnlyShow && personalSeasonIds.length > 0 },
  );
  const personalEpisodeIds = useMemo(
    () => personalEpisodesForShow.rows.map((episode) => episode.id),
    [personalEpisodesForShow.rows],
  );
  const personalEpisodeIdsKey = personalEpisodeIds.join("\0");
  const importsForShow = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          targetPersonalShowId: listImport.targetPersonalShowId,
        })
        .from(listImport)
        .where(eq(listImport.targetPersonalShowId, personalRow?.id ?? show.id)),
    [personalRow?.id, show.id],
    { ready: canEdit && personalRow != null },
  );
  const importsForSeasons = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          targetPersonalSeasonId: listImport.targetPersonalSeasonId,
        })
        .from(listImport)
        .where(inArray(listImport.targetPersonalSeasonId, personalSeasonIds)),
    [personalSeasonIdsKey],
    { ready: canEdit && isPersonalOnlyShow && personalSeasonIds.length > 0 },
  );
  const importsForEpisodes = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          targetPersonalEpisodeId: listImport.targetPersonalEpisodeId,
        })
        .from(listImport)
        .where(inArray(listImport.targetPersonalEpisodeId, personalEpisodeIds)),
    [personalEpisodeIdsKey],
    { ready: canEdit && isPersonalOnlyShow && personalEpisodeIds.length > 0 },
  );
  const showExclusions = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalListExclusion.id,
          canonicalShowId: personalListExclusion.canonicalShowId,
        })
        .from(personalListExclusion)
        .where(eq(personalListExclusion.canonicalShowId, show.id)),
    [show.id],
    { ready: canEdit && show.id !== newShowId },
  );
  const existingShowExclusion = showExclusions.rows[0] ?? null;
  const isLinkedImportedShow = isLinkedPublishedShowId(show.id);
  const canEditDraft = canEdit && !isLinkedImportedShow;
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
  const draftLinks = externalLinkTextToRows(draft.linksText);
  const canSaveOverlay = canEditDraft && personalOverlay.ready && !personalShows.loading && dirty && !savingOverlay;
  const canSubmitProposal = canEditDraft && canPropose && !personalShows.loading && !proposalSaving;
  const canDeletePersonalShow =
    canEditDraft &&
    personalRow != null &&
    !personalShows.loading &&
    !personalSeasonsForShow.loading &&
    !personalEpisodesForShow.loading &&
    !importsForShow.loading &&
    !importsForSeasons.loading &&
    !importsForEpisodes.loading &&
    !savingOverlay &&
    !deletingShow;
  const canHideCanonicalShow =
    canEditDraft &&
    show.id !== newShowId &&
    existingShowExclusion == null &&
    (personalRow == null || personalRow.canonicalShowId != null) &&
    !personalShows.loading &&
    !showExclusions.loading &&
    !hidingShow;

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
        externalLinks: draftLinks,
        notes: nullableText(draft.notes),
      };
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
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
      assertTransactionAcked(result, "Saving show overlay");
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
      const proposalResult = await client.transaction({ mode: "pessimistic" }, (tx) => {
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
            externalLinks: draftLinks,
            notes: nullableText(draft.notes),
          },
        });
      });
      assertTransactionAcked(proposalResult, "Sending canonical proposal");
      setProposalSent(true);
      void client
        .transaction({ mode: "pessimistic" }, (tx) => {
          tx.tables.maintainer_notification.create({
            id: crypto.randomUUID(),
            notificationKind: "canonical_proposal",
            status: "unread",
            title: `Canonical proposal: ${title}`,
            body: nullableText(draft.notes),
            relatedPublishApplicationId: null,
            relatedCanonicalProposalId: proposalId,
          });
        })
        .then((notificationResult) => {
          assertTransactionAcked(notificationResult, "Creating canonical proposal notification");
        })
        .catch(() => undefined);
    } catch (cause) {
      setProposalError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProposalSaving(false);
    }
  };

  const hideShow = async () => {
    setHidingShow(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.personal_list_exclusion.create({
          id: crypto.randomUUID(),
          excludedKind: "show",
          canonicalShowId: show.id,
          canonicalSeasonId: null,
          canonicalEpisodeId: null,
          reason: null,
        });
      });
      assertTransactionAcked(result, "Hiding show");
      void navigate({ to: "/manage" });
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setHidingShow(false);
    }
  };

  const deletePersonalShow = async () => {
    if (personalRow == null) return;
    const deleteChildren = personalRow.canonicalShowId == null;
    const importIds = uniqueIds([
      ...importsForEpisodes.rows.map((row) => row.id),
      ...importsForSeasons.rows.map((row) => row.id),
      ...importsForShow.rows.map((row) => row.id),
    ]);
    setDeletingShow(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        for (const importId of importIds) {
          tx.tables.list_import.delete({ id: importId });
        }
        if (deleteChildren) {
          for (const episode of personalEpisodesForShow.rows) {
            tx.tables.personal_episode.delete({ id: episode.id });
          }
          for (const season of personalSeasonsForShow.rows) {
            tx.tables.personal_season.delete({ id: season.id });
          }
        }
        tx.tables.personal_show.delete({ id: personalRow.id });
      });
      assertTransactionAcked(result, "Deleting personal show");
      void navigate({ to: "/manage" });
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingShow(false);
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
            disabled={!canEditDraft || show.id === newShowId}
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

      <Alert color={isLinkedImportedShow ? "blue" : canEdit ? "teal" : "yellow"} variant="light">
        {isLinkedImportedShow
          ? "This show is linked from a published list. Use Copy on the published list if you want an editable personal version."
          : canEdit
            ? "Save a browser-local draft while editing, or save this show-level metadata to your personal overlay."
            : "Sign in to create a browser-local management draft."}
      </Alert>
      {personalShows.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal overlay for this show: {personalShows.error.message}
        </Alert>
      )}
      {personalOverlay.error != null && (
        <Alert color="red" variant="light">
          Could not finish loading your personal overlay: {personalOverlay.error.message}
        </Alert>
      )}
      {(personalSeasonsForShow.error ??
        personalEpisodesForShow.error ??
        importsForShow.error ??
        importsForSeasons.error ??
        importsForEpisodes.error ??
        showExclusions.error) != null && (
        <Alert color="red" variant="light">
          Could not load the personal rows needed for deletion.
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
            disabled={!canEditDraft}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.currentTarget.value }))}
          />
          <TextInput
            label="Original title"
            value={draft.originalTitle}
            disabled={!canEditDraft}
            onChange={(event) => setDraft((current) => ({ ...current, originalTitle: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <Textarea
            label="Languages"
            autosize
            minRows={3}
            value={draft.languagesText}
            disabled={!canEditDraft}
            onChange={(event) => setDraft((current) => ({ ...current, languagesText: event.currentTarget.value }))}
          />
          <Textarea
            label="Countries"
            autosize
            minRows={3}
            value={draft.countriesText}
            disabled={!canEditDraft}
            onChange={(event) => setDraft((current) => ({ ...current, countriesText: event.currentTarget.value }))}
          />
          <Textarea
            label="Genres"
            autosize
            minRows={3}
            value={draft.genresText}
            disabled={!canEditDraft}
            onChange={(event) => setDraft((current) => ({ ...current, genresText: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <Textarea
          label="Links"
          autosize
          minRows={3}
          value={draft.linksText}
          disabled={!canEditDraft}
          onChange={(event) => setDraft((current) => ({ ...current, linksText: event.currentTarget.value }))}
        />
        <Textarea
          label="Notes"
          autosize
          minRows={4}
          value={draft.notes}
          disabled={!canEditDraft}
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
            <Button variant="default" disabled={!canEditDraft || !dirty} onClick={discardLocalDraft}>
              Discard
            </Button>
            <Button variant="light" disabled={!canEditDraft || !dirty} onClick={saveLocalDraft}>
              Save draft
            </Button>
            <Button disabled={!canSaveOverlay} loading={savingOverlay} onClick={() => void saveOverlay()}>
              Save to overlay
            </Button>
            <Button
              color="red"
              variant="light"
              disabled={!canHideCanonicalShow}
              loading={hidingShow}
              onClick={() => void hideShow()}
            >
              Hide from my list
            </Button>
            <Button
              color="red"
              variant="outline"
              disabled={!canDeletePersonalShow}
              loading={deletingShow}
              onClick={() => void deletePersonalShow()}
            >
              Delete personal show
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
          <Table className="schedule-table" striped highlightOnHover verticalSpacing="sm" miw={1100}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={120}>Season</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>When</Table.Th>
                <Table.Th>Release</Table.Th>
                <Table.Th w={140}>Lang</Table.Th>
                <Table.Th w={140}>Country</Table.Th>
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
                    <Stack gap={2}>
                      <Text size="sm">{releaseWindowSummary(season.releaseWindow) || "Unknown"}</Text>
                      {season.finaleWindow != null && (
                        <Text size="xs" c="dimmed">
                          Finale: {releaseWindowSummary(season.finaleWindow)}
                        </Text>
                      )}
                      {season.sortKey != null && (
                        <Text size="xs" c="dimmed">
                          Sort: {season.sortKey}
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>
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
                  <Table.Td>
                    <Group gap={4}>
                      {season.countries.length === 0 && <Text>Unknown</Text>}
                      {season.countries.map((country) => (
                        <Badge key={`${season.id}-${country}`} size="xs" variant="outline">
                          {country}
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
  externalLinks: unknown;
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
    linksText: externalLinksToText(row.externalLinks),
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

function releaseWindowSummary(value: unknown): string {
  if (!isRecord(value) || typeof value["raw"] !== "string" || value["raw"].trim() === "") return "";
  const raw = value["raw"].trim();
  const precision = typeof value["precision"] === "string" ? value["precision"] : "unknown";
  const confidence = typeof value["confidence"] === "string" ? value["confidence"] : "unknown";
  return [raw, precision, confidence].filter((item) => item !== "unknown").join(" · ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

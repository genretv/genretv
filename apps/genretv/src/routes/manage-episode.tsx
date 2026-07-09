import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import { Alert, Button, Group, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { eq, or } from "drizzle-orm";
import { useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { useManagementShows } from "../domain/live-management-shows";
import { assertTransactionAcked } from "../domain/mutation-acks";
import {
  findManagementSeason,
  type ManagementSeason,
  type ManagementShow,
  type ScheduleEpisode,
} from "../domain/schedule";
import {
  emptyEpisodeDraft,
  episodeDraftFromEpisode,
  episodeDraftStorageKey,
  externalLinkTextToRows,
  externalLinksToText,
  releaseWindowConfidence,
  releaseWindowDraftToWindow,
  releaseWindowPrecision,
  releaseWindowText,
  useManagementDraft,
  type ManagementEpisodeDraft,
} from "../features/management/drafts";
import { canSendCanonicalProposal } from "../features/management/proposals";
import { useSyncGroupsReady } from "../sync/use-sync-groups-ready";

const personalEpisode = genretvSyncRegistry.personal_episode.view!;
const personalSeason = genretvSyncRegistry.personal_season.view!;
const personalListExclusion = genretvSyncRegistry.personal_list_exclusion.view!;
const listImport = genretvSyncRegistry.list_import.view!;

const newEpisodeId = "new";

export function ManageEpisodeRoute() {
  const { showId, seasonId, episodeId } = useParams({
    from: "/manage/show/$showId/season/$seasonId/episode/$episodeId",
  });
  const { roles, session } = useAuth();
  const navigate = useNavigate();
  const { shows } = useManagementShows();
  const result = findManagementSeason(shows, showId, seasonId);

  if (result == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Season not found</Title>
        <Group>
          <Button variant="default" onClick={() => void navigate({ to: "/manage/show/$showId", params: { showId } })}>
            Show
          </Button>
          <Button component={Link} to="/manage" variant="default">
            Shows
          </Button>
        </Group>
      </Stack>
    );
  }

  const episode =
    episodeId === newEpisodeId ? null : (result.season.episodes.find((item) => item.id === episodeId) ?? null);
  return (
    <EditableEpisode
      show={result.show}
      season={result.season}
      episode={episode}
      episodeId={episodeId}
      canEdit={session != null}
      canPropose={canSendCanonicalProposal(roles)}
    />
  );
}

function EditableEpisode({
  show,
  season,
  episode,
  episodeId,
  canEdit,
  canPropose,
}: {
  show: ManagementShow;
  season: ManagementSeason;
  episode: ScheduleEpisode | null;
  episodeId: string;
  canEdit: boolean;
  canPropose: boolean;
}) {
  const navigate = useNavigate();
  const client = useSyncClient();
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [hidingEpisode, setHidingEpisode] = useState(false);
  const [deletingEpisode, setDeletingEpisode] = useState(false);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlaySaved, setOverlaySaved] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const personalOverlay = useSyncGroupsReady(client, canEdit, "personal_season", "personal_episode");
  const personalEpisodes = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalEpisode.id,
          canonicalEpisodeId: personalEpisode.canonicalEpisodeId,
          episodeLabel: personalEpisode.episodeLabel,
          personalSeasonId: personalEpisode.personalSeasonId,
          title: personalEpisode.title,
          releaseWindow: personalEpisode.releaseWindow,
          sortKey: personalEpisode.sortKey,
          externalLinks: personalEpisode.externalLinks,
          notes: personalEpisode.notes,
        })
        .from(personalEpisode)
        .where(or(eq(personalEpisode.canonicalSeasonId, season.id), eq(personalEpisode.personalSeasonId, season.id))),
    [season.id],
    { ready: canEdit },
  );
  const personalSeasons = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalSeason.id,
          canonicalShowId: personalSeason.canonicalShowId,
          canonicalSeasonId: personalSeason.canonicalSeasonId,
        })
        .from(personalSeason)
        .where(or(eq(personalSeason.id, season.id), eq(personalSeason.canonicalSeasonId, season.id))),
    [season.id],
    { ready: canEdit },
  );
  const personalRow =
    personalEpisodes.rows.find((row) => row.id === episodeId) ??
    personalEpisodes.rows.find((row) => row.canonicalEpisodeId === episodeId) ??
    null;
  const personalSeasonRow = personalSeasons.rows[0] ?? null;
  const isPersonalOnlySeason = personalSeasonRow != null && personalSeasonRow.canonicalSeasonId == null;
  const importsForEpisode = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          targetPersonalEpisodeId: listImport.targetPersonalEpisodeId,
        })
        .from(listImport)
        .where(eq(listImport.targetPersonalEpisodeId, personalRow?.id ?? episodeId)),
    [personalRow?.id, episodeId],
    { ready: canEdit && episodeId !== newEpisodeId && personalRow != null },
  );
  const episodeExclusions = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalListExclusion.id,
          canonicalEpisodeId: personalListExclusion.canonicalEpisodeId,
        })
        .from(personalListExclusion)
        .where(eq(personalListExclusion.canonicalEpisodeId, episodeId)),
    [episodeId],
    { ready: canEdit && episodeId !== newEpisodeId },
  );
  const existingEpisodeExclusion = episodeExclusions.rows[0] ?? null;

  if (episodeId !== newEpisodeId && episode == null && !personalEpisodes.loading && personalRow == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Episode not found</Title>
        <Button
          variant="default"
          onClick={() =>
            void navigate({
              to: "/manage/show/$showId/season/$seasonId",
              params: { showId: show.id, seasonId: season.id },
            })
          }
        >
          Season
        </Button>
      </Stack>
    );
  }

  const initialDraft = useMemo(
    () =>
      personalRow == null
        ? episode == null
          ? emptyEpisodeDraft()
          : episodeDraftFromEpisode(episode)
        : episodeDraftFromPersonalRow(personalRow),
    [episode, personalRow],
  );
  const { draft, dirty, locallySaved, setDraft, saveLocalDraft, discardLocalDraft } = useManagementDraft(
    episodeDraftStorageKey(season.id, episodeId),
    initialDraft,
  );
  const draftLinks = externalLinkTextToRows(draft.linksText);
  const draftReleaseWindow = releaseWindowDraftToWindow(
    draft.releaseDate,
    draft.releasePrecision,
    draft.dateConfidence,
  );
  const canSaveOverlay =
    canEdit &&
    personalOverlay.ready &&
    !personalEpisodes.loading &&
    !personalSeasons.loading &&
    dirty &&
    !savingOverlay;
  const canSubmitProposal =
    canEdit && canPropose && !personalEpisodes.loading && !personalSeasons.loading && !proposalSaving;
  const canDeletePersonalEpisode =
    canEdit && personalRow != null && !importsForEpisode.loading && !savingOverlay && !deletingEpisode;
  const canHideCanonicalEpisode =
    canEdit &&
    episode != null &&
    existingEpisodeExclusion == null &&
    (personalRow == null || personalRow.canonicalEpisodeId != null) &&
    !personalEpisodes.loading &&
    !episodeExclusions.loading &&
    !hidingEpisode;

  const saveOverlay = async () => {
    const createdId = personalRow?.id ?? crypto.randomUUID();
    setSavingOverlay(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const patch = {
        episodeLabel: nullableText(draft.episodeLabel),
        title: nullableText(draft.title),
        releaseWindow: draftReleaseWindow,
        sortKey: nullableText(draft.sortKey),
        externalLinks: draftLinks,
        notes: nullableText(draft.notes),
      };
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (personalRow == null) {
          tx.tables.personal_episode.create({
            id: createdId,
            canonicalShowId: show.id,
            canonicalSeasonId: isPersonalOnlySeason ? null : season.id,
            canonicalEpisodeId: episode == null ? null : episode.id,
            personalSeasonId: isPersonalOnlySeason ? season.id : null,
            ...patch,
          });
        } else {
          tx.tables.personal_episode.update({ id: personalRow.id }, patch);
        }
      });
      assertTransactionAcked(result, "Saving episode overlay");
      setOverlaySaved(true);
      if (episodeId === newEpisodeId) {
        void navigate({
          to: "/manage/show/$showId/season/$seasonId/episode/$episodeId",
          params: { showId: show.id, seasonId: season.id, episodeId: createdId },
        });
      }
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingOverlay(false);
    }
  };

  const sendCanonicalProposal = async () => {
    const proposalId = crypto.randomUUID();
    const targetCanonicalEpisodeId =
      personalRow == null ? (episode == null ? null : episode.id) : personalRow.canonicalEpisodeId;
    const targetCanonicalSeasonId = personalSeasonRow == null ? season.id : personalSeasonRow.canonicalSeasonId;
    const targetCanonicalShowId = personalSeasonRow == null ? show.id : personalSeasonRow.canonicalShowId;
    const episodeLabel = draft.episodeLabel.trim() || episode?.episodeLabel || "Episode";
    const title = `${show.title} ${season.seasonLabel} ${episodeLabel}`.trim();
    setProposalSaving(true);
    setProposalError(null);
    setProposalSent(false);
    try {
      const proposalResult = await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.canonical_proposal.create({
          id: proposalId,
          proposalKind: "episode",
          status: "open",
          title,
          message: nullableText(draft.notes),
          personalShowId: null,
          personalSeasonId: personalSeasonRow?.id ?? null,
          personalEpisodeId: personalRow?.id ?? null,
          canonicalShowId: targetCanonicalShowId,
          canonicalSeasonId: targetCanonicalSeasonId,
          canonicalEpisodeId: targetCanonicalEpisodeId,
          proposedPayload: {
            kind: "episode",
            showTitle: show.title,
            seasonLabel: season.seasonLabel,
            section: season.section,
            timing: season.timing,
            endedReason: season.endedReason,
            releasePattern: season.releasePattern,
            releasePrecision: season.releasePrecision,
            dateConfidence: season.dateConfidence,
            seasonReleaseWindow: season.releaseWindow,
            finaleWindow: season.finaleWindow,
            seasonSortKey: season.sortKey,
            seasonEpisodeCount: season.episodeCount,
            sourceRow: season.sourceRow,
            organizations: season.organizations.map((name) => ({ name, role: "unknown", externalLinks: [] })),
            seasonExternalLinks: season.links,
            seasonNotes: season.notes,
            episodeLabel: nullableText(draft.episodeLabel),
            title: nullableText(draft.title),
            releaseWindow: draftReleaseWindow,
            sortKey: nullableText(draft.sortKey),
            externalLinks: draftLinks,
            notes: nullableText(draft.notes),
          },
        });
      });
      assertTransactionAcked(proposalResult, "Sending canonical proposal");
      setProposalSent(true);
    } catch (cause) {
      setProposalError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProposalSaving(false);
    }
  };

  const hideEpisode = async () => {
    if (episode == null) return;
    setHidingEpisode(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.personal_list_exclusion.create({
          id: crypto.randomUUID(),
          excludedKind: "episode",
          canonicalShowId: show.id,
          canonicalSeasonId: season.id,
          canonicalEpisodeId: episode.id,
          reason: null,
        });
      });
      assertTransactionAcked(result, "Hiding episode");
      void navigate({
        to: "/manage/show/$showId/season/$seasonId",
        params: { showId: show.id, seasonId: season.id },
      });
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setHidingEpisode(false);
    }
  };

  const deletePersonalEpisode = async () => {
    if (personalRow == null) return;
    setDeletingEpisode(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        for (const importRow of importsForEpisode.rows) {
          tx.tables.list_import.delete({ id: importRow.id });
        }
        tx.tables.personal_episode.delete({ id: personalRow.id });
      });
      assertTransactionAcked(result, "Deleting personal episode");
      void navigate({
        to: "/manage/show/$showId/season/$seasonId",
        params: { showId: show.id, seasonId: season.id },
      });
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingEpisode(false);
    }
  };

  return (
    <Stack className="schedule-panel" gap="lg" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{episode == null ? "New episode" : episode.episodeLabel || "Episode"}</Title>
          <Text c="dimmed">
            {show.title} {season.seasonLabel}
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            onClick={() =>
              void navigate({
                to: "/manage/show/$showId/season/$seasonId",
                params: { showId: show.id, seasonId: season.id },
              })
            }
          >
            Season
          </Button>
          <Button component={Link} to="/manage" variant="default">
            Shows
          </Button>
        </Group>
      </Group>

      <Alert color={canEdit ? "teal" : "yellow"} variant="light">
        {canEdit
          ? "Save a browser-local draft while editing, or save this episode to your personal overlay."
          : "Sign in to create a browser-local management draft."}
      </Alert>
      {personalEpisodes.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal overlay for this episode: {personalEpisodes.error.message}
        </Alert>
      )}
      {personalSeasons.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal overlay for this season: {personalSeasons.error.message}
        </Alert>
      )}
      {personalOverlay.error != null && (
        <Alert color="red" variant="light">
          Could not finish loading your personal overlay: {personalOverlay.error.message}
        </Alert>
      )}
      {importsForEpisode.error != null && (
        <Alert color="red" variant="light">
          Could not load published-list import links for this episode: {importsForEpisode.error.message}
        </Alert>
      )}
      {episodeExclusions.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal hidden rows: {episodeExclusions.error.message}
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
            label="Episode"
            value={draft.episodeLabel}
            disabled={!canEdit}
            onChange={(event) => {
              const episodeLabel = event.currentTarget.value;
              setDraft((current) => ({ ...current, episodeLabel }));
            }}
          />
          <TextInput
            label="Release date"
            value={draft.releaseDate}
            disabled={!canEdit}
            onChange={(event) => {
              const releaseDate = event.currentTarget.value;
              setDraft((current) => ({ ...current, releaseDate }));
            }}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Title"
            value={draft.title}
            disabled={!canEdit}
            onChange={(event) => {
              const title = event.currentTarget.value;
              setDraft((current) => ({ ...current, title }));
            }}
          />
          <TextInput
            label="Sort key"
            value={draft.sortKey}
            disabled={!canEdit}
            onChange={(event) => {
              const sortKey = event.currentTarget.value;
              setDraft((current) => ({ ...current, sortKey }));
            }}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Date precision"
            value={draft.releasePrecision}
            disabled={!canEdit}
            data={[
              { value: "unknown", label: "Unknown" },
              { value: "day", label: "Day" },
              { value: "month", label: "Month" },
              { value: "month_day", label: "Month/day" },
              { value: "season", label: "Season" },
              { value: "year", label: "Year" },
            ]}
            onChange={(value) => setDraft((current) => ({ ...current, releasePrecision: value ?? "unknown" }))}
          />
          <Select
            label="Date confidence"
            value={draft.dateConfidence}
            disabled={!canEdit}
            data={[
              { value: "unknown", label: "Unknown" },
              { value: "confirmed", label: "Confirmed" },
              { value: "expected", label: "Expected" },
              { value: "estimated", label: "Estimated" },
            ]}
            onChange={(value) => setDraft((current) => ({ ...current, dateConfidence: value ?? "unknown" }))}
          />
        </SimpleGrid>
        <Textarea
          label="Links"
          autosize
          minRows={3}
          value={draft.linksText}
          disabled={!canEdit}
          onChange={(event) => {
            const linksText = event.currentTarget.value;
            setDraft((current) => ({ ...current, linksText }));
          }}
        />
        <Textarea
          label="Notes"
          autosize
          minRows={4}
          value={draft.notes}
          disabled={!canEdit}
          onChange={(event) => {
            const notes = event.currentTarget.value;
            setDraft((current) => ({ ...current, notes }));
          }}
        />
        <Group justify="flex-end">
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
          <Button
            color="red"
            variant="light"
            disabled={!canHideCanonicalEpisode}
            loading={hidingEpisode}
            onClick={() => void hideEpisode()}
          >
            Hide from my list
          </Button>
          <Button
            color="red"
            variant="outline"
            disabled={!canDeletePersonalEpisode}
            loading={deletingEpisode}
            onClick={() => void deletePersonalEpisode()}
          >
            Delete personal episode
          </Button>
        </Group>
        {locallySaved && (
          <Text size="sm" c="dimmed">
            Local draft saved.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}

function episodeDraftFromPersonalRow(row: {
  episodeLabel: string | null;
  externalLinks: unknown;
  notes: string | null;
  releaseWindow: unknown;
  sortKey: string | null;
  title: string | null;
}): ManagementEpisodeDraft {
  return {
    episodeLabel: row.episodeLabel ?? "",
    title: row.title ?? "",
    releaseDate: releaseWindowText(row.releaseWindow),
    releasePrecision: releaseWindowPrecision(row.releaseWindow),
    dateConfidence: releaseWindowConfidence(row.releaseWindow),
    sortKey: row.sortKey ?? "",
    linksText: externalLinksToText(row.externalLinks),
    notes: row.notes ?? "",
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

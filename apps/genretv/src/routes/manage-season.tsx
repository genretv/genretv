import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Group,
  ScrollArea,
  Select,
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
import { assertTransactionAcked } from "../domain/mutation-acks";
import {
  findManagementSeason,
  formatEpisodeCount,
  formatScheduleStatus,
  sectionLabels,
  type ManagementSeason,
  type ManagementShow,
} from "../domain/schedule";
import {
  externalLinkTextToRows,
  externalLinksToText,
  organizationRowsToText,
  organizationTextToRows,
  parseEpisodeCountDraft,
  releaseWindowDraftToWindow,
  releaseWindowText,
  seasonDraftFromSeason,
  seasonDraftStorageKey,
  useManagementDraft,
  type ManagementSeasonDraft,
} from "../features/management/drafts";
import {
  ManagementActionBar,
  ManagementEditorSection,
  ParsedLinksPreview,
  ParsedListPreview,
} from "../features/management/editor-ui";
import { canSendCanonicalProposal } from "../features/management/proposals";
import { sourcePublishedSeasonIdFromLinkedId } from "../features/publishing/linked-imports";
import { useSyncGroupsReady } from "../sync/use-sync-groups-ready";

const personalShow = genretvSyncRegistry.personal_show.view!;
const personalSeason = genretvSyncRegistry.personal_season.view!;
const personalEpisode = genretvSyncRegistry.personal_episode.view!;
const personalListExclusion = genretvSyncRegistry.personal_list_exclusion.view!;
const listImport = genretvSyncRegistry.list_import.view!;
const newSeasonId = "new";

export function ManageSeasonRoute() {
  const { showId, seasonId } = useParams({ from: "/manage/show/$showId/season/$seasonId" });
  const { roles, session } = useAuth();
  const navigate = useNavigate();
  const { shows } = useManagementShows();
  const show = shows.find((candidate) => candidate.id === showId) ?? null;
  const result =
    seasonId === newSeasonId && show != null
      ? { show, season: emptyManagementSeason(show) }
      : findManagementSeason(shows, showId, seasonId);

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

  return (
    <EditableSeason
      show={result.show}
      season={result.season}
      canEdit={session != null}
      canPropose={canSendCanonicalProposal(roles)}
    />
  );
}

function EditableSeason({
  show,
  season,
  canEdit,
  canPropose,
}: {
  show: ManagementShow;
  season: ManagementSeason;
  canEdit: boolean;
  canPropose: boolean;
}) {
  const navigate = useNavigate();
  const client = useSyncClient();
  const [savingOverlay, setSavingOverlay] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [overlaySaved, setOverlaySaved] = useState(false);
  const [hidingSeason, setHidingSeason] = useState(false);
  const [deletingSeason, setDeletingSeason] = useState(false);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const personalOverlay = useSyncGroupsReady(client, canEdit, "personal_show", "personal_season");
  const status = formatScheduleStatus(season.scheduleSection, show.endedReason, season.isFinal);
  const episodeCount = formatEpisodeCount(season.episodeCount, season.episodes);
  const personalSeasons = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalSeason.id,
          personalShowId: personalSeason.personalShowId,
          canonicalShowId: personalSeason.canonicalShowId,
          canonicalSeasonId: personalSeason.canonicalSeasonId,
          section: personalSeason.section,
          seasonNumber: personalSeason.seasonNumber,
          seasonLabel: personalSeason.seasonLabel,
          title: personalSeason.title,
          releaseKind: personalSeason.releaseKind,
          isFinal: personalSeason.isFinal,
          timing: personalSeason.timing,
          releasePattern: personalSeason.releasePattern,
          releasePrecision: personalSeason.releasePrecision,
          dateConfidence: personalSeason.dateConfidence,
          releaseWindow: personalSeason.releaseWindow,
          finaleWindow: personalSeason.finaleWindow,
          sortKey: personalSeason.sortKey,
          episodeCount: personalSeason.episodeCount,
          organizations: personalSeason.organizations,
          externalLinks: personalSeason.externalLinks,
          notes: personalSeason.notes,
        })
        .from(personalSeason)
        .where(or(eq(personalSeason.id, season.id), eq(personalSeason.canonicalSeasonId, season.id))),
    [season.id],
    { ready: canEdit && season.id !== newSeasonId },
  );
  const personalRow = personalSeasons.rows[0] ?? null;
  const personalShows = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalShow.id,
          canonicalShowId: personalShow.canonicalShowId,
        })
        .from(personalShow)
        .where(or(eq(personalShow.id, show.id), eq(personalShow.canonicalShowId, show.id))),
    [show.id],
    { ready: canEdit },
  );
  const personalShowRow = personalShows.rows[0] ?? null;
  const personalSeasonSiblings = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalSeason.id,
          personalShowId: personalSeason.personalShowId,
        })
        .from(personalSeason)
        .where(eq(personalSeason.personalShowId, show.id)),
    [show.id],
    { ready: canEdit && personalShowRow?.canonicalShowId === null },
  );
  const personalEpisodesForSeason = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalEpisode.id,
          personalSeasonId: personalEpisode.personalSeasonId,
        })
        .from(personalEpisode)
        .where(eq(personalEpisode.personalSeasonId, season.id)),
    [season.id],
    { ready: canEdit && season.id !== newSeasonId },
  );
  const importsForSeason = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          targetPersonalSeasonId: listImport.targetPersonalSeasonId,
        })
        .from(listImport)
        .where(eq(listImport.targetPersonalSeasonId, season.id)),
    [season.id],
    { ready: canEdit && season.id !== newSeasonId },
  );
  const sourcePublishedSeasonId = sourcePublishedSeasonIdFromLinkedId(season.id);
  const linkedImportsForSeason = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: listImport.id,
          sourcePublishedSeasonId: listImport.sourcePublishedSeasonId,
        })
        .from(listImport)
        .where(eq(listImport.sourcePublishedSeasonId, sourcePublishedSeasonId ?? "")),
    [sourcePublishedSeasonId],
    { ready: canEdit && sourcePublishedSeasonId != null },
  );
  const seasonExclusions = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: personalListExclusion.id,
          canonicalSeasonId: personalListExclusion.canonicalSeasonId,
        })
        .from(personalListExclusion)
        .where(eq(personalListExclusion.canonicalSeasonId, season.id)),
    [season.id],
    { ready: canEdit && season.id !== newSeasonId },
  );
  const existingSeasonExclusion = seasonExclusions.rows[0] ?? null;
  const isLinkedImportedSeason = sourcePublishedSeasonId != null;
  const canEditDraft = canEdit && !isLinkedImportedSeason;
  const initialDraft = useMemo(
    () => (personalRow == null ? seasonDraftFromSeason(season) : seasonDraftFromPersonalRow(personalRow)),
    [personalRow, season],
  );
  const { draft, dirty, locallySaved, setDraft, saveLocalDraft, discardLocalDraft } = useManagementDraft(
    seasonDraftStorageKey(season.id),
    initialDraft,
  );
  const draftEpisodeCount = parseEpisodeCountDraft(draft.episodeCount);
  const draftSeasonNumber = parseSeasonNumberDraft(draft.seasonNumber);
  const draftLinks = externalLinkTextToRows(draft.linksText);
  const draftReleaseWindow = releaseWindowDraftToWindow(
    draft.releaseWindowText,
    draft.releasePrecision,
    draft.dateConfidence,
  );
  const draftFinaleWindow = releaseWindowDraftToWindow(
    draft.finaleWindowText,
    draft.releasePrecision,
    draft.dateConfidence,
  );
  const episodeCountValid = draft.episodeCount.trim() === "" || draftEpisodeCount != null;
  const seasonNumberValid =
    draft.releaseKind !== "season" || (draft.seasonNumber.trim() !== "" && draftSeasonNumber != null);
  const emptyEpisodeText =
    season.episodeCount === 1 ? "1 episode, no row yet" : `${episodeCount} episodes, no rows yet`;
  const canSaveOverlay =
    canEditDraft &&
    personalOverlay.ready &&
    !personalSeasons.loading &&
    !personalShows.loading &&
    dirty &&
    episodeCountValid &&
    seasonNumberValid &&
    !savingOverlay;
  const canSubmitProposal =
    canEditDraft &&
    canPropose &&
    !personalSeasons.loading &&
    !personalShows.loading &&
    episodeCountValid &&
    seasonNumberValid &&
    !proposalSaving;
  const canAddEpisode = canEditDraft && season.id !== newSeasonId;
  const canHideCanonicalSeason =
    canEditDraft &&
    season.id !== newSeasonId &&
    !personalSeasons.loading &&
    !seasonExclusions.loading &&
    existingSeasonExclusion == null &&
    (personalRow == null || personalRow.canonicalSeasonId != null) &&
    !hidingSeason;
  const canDeletePersonalSeason =
    canEdit &&
    personalRow != null &&
    personalRow.canonicalSeasonId == null &&
    !personalEpisodesForSeason.loading &&
    !importsForSeason.loading &&
    !personalSeasonSiblings.loading &&
    !deletingSeason;
  const canRemoveLinkedImport =
    canEdit &&
    isLinkedImportedSeason &&
    linkedImportsForSeason.rows.length > 0 &&
    !linkedImportsForSeason.loading &&
    !deletingSeason;

  const saveOverlay = async () => {
    const createdId = personalRow?.id ?? crypto.randomUUID();
    const isPersonalOnlyShow = personalShowRow != null && personalShowRow.canonicalShowId == null;
    setSavingOverlay(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const patch = {
        section: draft.section,
        seasonNumber: draft.releaseKind === "season" ? draftSeasonNumber : null,
        seasonLabel: nullableText(draft.seasonLabel),
        title: nullableText(draft.title),
        releaseKind: draft.releaseKind,
        isFinal: draft.isFinal,
        timing: draft.timing.trim(),
        releasePattern: nullableText(draft.releasePattern),
        releasePrecision: draft.releasePrecision,
        dateConfidence: draft.dateConfidence,
        releaseWindow: draftReleaseWindow,
        finaleWindow: draftFinaleWindow,
        sortKey: nullableText(draft.sortKey),
        episodeCount: draftEpisodeCount,
        organizations: organizationTextToRows(draft.organizationsText),
        externalLinks: draftLinks,
        notes: nullableText(draft.notes),
      };
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (personalRow == null) {
          tx.tables.personal_season.create({
            id: createdId,
            personalShowId: isPersonalOnlyShow ? show.id : null,
            canonicalShowId: isPersonalOnlyShow ? null : show.id,
            canonicalSeasonId: season.id === newSeasonId ? null : season.id,
            ...patch,
          });
        } else {
          tx.tables.personal_season.update({ id: personalRow.id }, patch);
        }
      });
      assertTransactionAcked(result, "Saving season overlay");
      setOverlaySaved(true);
      if (season.id === newSeasonId) {
        void navigate({
          to: "/manage/show/$showId/season/$seasonId",
          params: { showId: show.id, seasonId: createdId },
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
    const releaseLabel =
      draft.seasonLabel.trim() ||
      draft.title.trim() ||
      (draftSeasonNumber == null ? draft.releaseKind : `S${draftSeasonNumber}`);
    const title = `${show.title} ${releaseLabel}`.trim();
    const isPersonalOnlySeason = personalRow != null && personalRow.canonicalSeasonId == null;
    const isPersonalOnlyShow = personalShowRow != null && personalShowRow.canonicalShowId == null;
    setProposalSaving(true);
    setProposalError(null);
    setProposalSent(false);
    try {
      const proposalResult = await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.canonical_proposal.create({
          id: proposalId,
          proposalKind: "season",
          status: "open",
          title,
          message: nullableText(draft.notes),
          personalShowId: personalShowRow?.id ?? null,
          personalSeasonId: personalRow?.id ?? null,
          personalEpisodeId: null,
          canonicalShowId: isPersonalOnlyShow ? null : show.id,
          canonicalSeasonId: season.id === newSeasonId || isPersonalOnlySeason ? null : season.id,
          canonicalEpisodeId: null,
          proposedPayload: {
            kind: "season",
            showTitle: show.title,
            section: draft.section,
            seasonNumber: draft.releaseKind === "season" ? draftSeasonNumber : null,
            seasonLabel: nullableText(draft.seasonLabel),
            title: nullableText(draft.title),
            releaseKind: draft.releaseKind,
            isFinal: draft.isFinal,
            timing: draft.timing.trim(),
            releasePattern: nullableText(draft.releasePattern),
            releasePrecision: draft.releasePrecision,
            dateConfidence: draft.dateConfidence,
            releaseWindow: draftReleaseWindow,
            finaleWindow: draftFinaleWindow,
            sortKey: nullableText(draft.sortKey),
            episodeCount: draftEpisodeCount,
            organizations: organizationTextToRows(draft.organizationsText),
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

  const hideSeason = async () => {
    setHidingSeason(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.personal_list_exclusion.create({
          id: crypto.randomUUID(),
          excludedKind: "season",
          canonicalShowId: show.id,
          canonicalSeasonId: season.id,
          canonicalEpisodeId: null,
          reason: null,
        });
      });
      assertTransactionAcked(result, "Hiding season");
      void navigate({ to: "/manage/show/$showId", params: { showId: show.id } });
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setHidingSeason(false);
    }
  };

  const deletePersonalSeason = async () => {
    if (personalRow == null || personalRow.canonicalSeasonId != null) return;
    const deletePersonalShow =
      personalShowRow != null &&
      personalShowRow.canonicalShowId == null &&
      personalSeasonSiblings.rows.filter((row) => row.id !== personalRow.id).length === 0;
    setDeletingSeason(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        for (const importRow of importsForSeason.rows) {
          tx.tables.list_import.delete({ id: importRow.id });
        }
        for (const episode of personalEpisodesForSeason.rows) {
          tx.tables.personal_episode.delete({ id: episode.id });
        }
        tx.tables.personal_season.delete({ id: personalRow.id });
        if (deletePersonalShow && personalShowRow != null) {
          tx.tables.personal_show.delete({ id: personalShowRow.id });
        }
      });
      assertTransactionAcked(result, "Deleting personal season");
      if (deletePersonalShow) {
        void navigate({ to: "/manage" });
      } else {
        void navigate({ to: "/manage/show/$showId", params: { showId: show.id } });
      }
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingSeason(false);
    }
  };

  const removeLinkedImport = async () => {
    setDeletingSeason(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        for (const importRow of linkedImportsForSeason.rows) {
          tx.tables.list_import.delete({ id: importRow.id });
        }
      });
      assertTransactionAcked(result, "Removing linked import");
      void navigate({ to: "/manage" });
    } catch (cause) {
      setOverlayError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingSeason(false);
    }
  };

  return (
    <Stack className="schedule-panel" gap="lg" maw={1040} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>
            {show.title} {season.id === newSeasonId ? "New season" : season.seasonLabel}
          </Title>
          <Text c="dimmed">{status}</Text>
        </div>
        <Group>
          <Button
            variant="default"
            onClick={() => void navigate({ to: "/manage/show/$showId", params: { showId: show.id } })}
          >
            Show
          </Button>
          <Button component={Link} to="/manage" variant="default">
            Shows
          </Button>
        </Group>
      </Group>

      <Alert color={isLinkedImportedSeason ? "blue" : canEdit ? "teal" : "yellow"} variant="light">
        {isLinkedImportedSeason
          ? "This season is linked from a published list. Remove the link here, or use Copy on the published list for an editable personal version."
          : canEdit
            ? "Save a browser-local draft while editing, or save this season-level metadata to your personal overlay."
            : "Sign in to create a browser-local management draft."}
      </Alert>
      {season.id === newSeasonId && canEdit && (
        <Alert color="blue" variant="light">
          Save the season to your overlay before adding episodes.
        </Alert>
      )}
      {personalSeasons.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal overlay for this season: {personalSeasons.error.message}
        </Alert>
      )}
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
      {(personalEpisodesForSeason.error ??
        importsForSeason.error ??
        linkedImportsForSeason.error ??
        personalSeasonSiblings.error) != null && (
        <Alert color="red" variant="light">
          Could not load the personal rows needed for deletion.
        </Alert>
      )}
      {seasonExclusions.error != null && (
        <Alert color="red" variant="light">
          Could not load your personal hidden rows: {seasonExclusions.error.message}
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

      <Stack gap="lg">
        <ManagementEditorSection title="Season identity" description="How this row appears in the schedule.">
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Select
              label="Release kind"
              value={draft.releaseKind}
              disabled={!canEditDraft}
              data={[
                { value: "season", label: "Season" },
                { value: "special", label: "Special" },
                { value: "movie", label: "Movie" },
                { value: "pilot", label: "Pilot" },
                { value: "other", label: "Other" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  releaseKind: (value ?? current.releaseKind) as ManagementSeasonDraft["releaseKind"],
                }))
              }
            />
            <TextInput
              label="Season number"
              value={draft.seasonNumber}
              disabled={!canEditDraft || draft.releaseKind !== "season"}
              error={!seasonNumberValid ? "Use a positive whole number" : null}
              onChange={(event) => {
                const seasonNumber = event.currentTarget.value;
                setDraft((current) => ({ ...current, seasonNumber }));
              }}
            />
            <TextInput
              label="Custom label"
              value={draft.seasonLabel}
              disabled={!canEditDraft}
              onChange={(event) => {
                const seasonLabel = event.currentTarget.value;
                setDraft((current) => ({ ...current, seasonLabel }));
              }}
            />
            <TextInput
              label="Release title"
              value={draft.title}
              disabled={!canEditDraft}
              onChange={(event) => {
                const title = event.currentTarget.value;
                setDraft((current) => ({ ...current, title }));
              }}
            />
            <Select
              label="Section"
              value={draft.section}
              disabled={!canEditDraft}
              data={[
                { value: "current", label: sectionLabels.current },
                { value: "upcoming", label: sectionLabels.upcoming },
                { value: "past", label: sectionLabels.past },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  section: (value ?? current.section) as ManagementSeasonDraft["section"],
                }))
              }
            />
            <TextInput
              label="Episodes"
              value={draft.episodeCount}
              disabled={!canEditDraft}
              error={!episodeCountValid ? "Use a whole number or leave blank" : null}
              onChange={(event) => {
                const episodeCount = event.currentTarget.value;
                setDraft((current) => ({ ...current, episodeCount }));
              }}
            />
            <Checkbox
              label="Final release"
              checked={draft.isFinal}
              disabled={!canEditDraft}
              onChange={(event) => {
                const isFinal = event.currentTarget.checked;
                setDraft((current) => ({ ...current, isFinal }));
              }}
              mt="xl"
            />
          </SimpleGrid>
          <Group gap={4}>
            {season.languages.map((language) => (
              <Badge key={`${season.id}-${language}`} size="xs" variant="light">
                {language}
              </Badge>
            ))}
            {season.countries.map((country) => (
              <Badge key={`${season.id}-${country}`} size="xs" variant="outline">
                {country}
              </Badge>
            ))}
          </Group>
        </ManagementEditorSection>

        <ManagementEditorSection title="Timing" description="Human schedule text plus structured release metadata.">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="When"
              value={draft.timing}
              disabled={!canEditDraft}
              onChange={(event) => {
                const timing = event.currentTarget.value;
                setDraft((current) => ({ ...current, timing }));
              }}
            />
            <TextInput
              label="Release pattern"
              value={draft.releasePattern}
              disabled={!canEditDraft}
              onChange={(event) => {
                const releasePattern = event.currentTarget.value;
                setDraft((current) => ({ ...current, releasePattern }));
              }}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput
              label="Release window"
              value={draft.releaseWindowText}
              disabled={!canEditDraft}
              onChange={(event) => {
                const releaseWindowText = event.currentTarget.value;
                setDraft((current) => ({ ...current, releaseWindowText }));
              }}
            />
            <TextInput
              label="Finale window"
              value={draft.finaleWindowText}
              disabled={!canEditDraft}
              onChange={(event) => {
                const finaleWindowText = event.currentTarget.value;
                setDraft((current) => ({ ...current, finaleWindowText }));
              }}
            />
            <TextInput
              label="Sort key"
              value={draft.sortKey}
              disabled={!canEditDraft}
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
              disabled={!canEditDraft}
              data={[
                { value: "unknown", label: "Unknown" },
                { value: "day", label: "Day" },
                { value: "month", label: "Month" },
                { value: "season", label: "Season" },
                { value: "year", label: "Year" },
              ]}
              onChange={(value) => setDraft((current) => ({ ...current, releasePrecision: value ?? "unknown" }))}
            />
            <Select
              label="Date confidence"
              value={draft.dateConfidence}
              disabled={!canEditDraft}
              data={[
                { value: "unknown", label: "Unknown" },
                { value: "confirmed", label: "Confirmed" },
                { value: "expected", label: "Expected" },
                { value: "estimated", label: "Estimated" },
              ]}
              onChange={(value) => setDraft((current) => ({ ...current, dateConfidence: value ?? "unknown" }))}
            />
          </SimpleGrid>
        </ManagementEditorSection>

        <ManagementEditorSection title="Organizations" description="Ordered organization names, one per line.">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Textarea
              label="Organizations"
              autosize
              minRows={4}
              value={draft.organizationsText}
              disabled={!canEditDraft}
              onChange={(event) => {
                const organizationsText = event.currentTarget.value;
                setDraft((current) => ({ ...current, organizationsText }));
              }}
            />
            <ParsedListPreview
              label="Parsed organizations"
              values={organizationTextToRows(draft.organizationsText).map((row) => row.name)}
            />
          </SimpleGrid>
        </ManagementEditorSection>

        <ManagementEditorSection title="References" description="Use label | url, or kind | label | url.">
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Textarea
              label="Links"
              autosize
              minRows={4}
              value={draft.linksText}
              disabled={!canEditDraft}
              onChange={(event) => {
                const linksText = event.currentTarget.value;
                setDraft((current) => ({ ...current, linksText }));
              }}
            />
            <ParsedLinksPreview links={draftLinks} />
          </SimpleGrid>
        </ManagementEditorSection>

        <ManagementEditorSection title="Notes">
          <Textarea
            label="Notes"
            autosize
            minRows={4}
            value={draft.notes}
            disabled={!canEditDraft}
            onChange={(event) => {
              const notes = event.currentTarget.value;
              setDraft((current) => ({ ...current, notes }));
            }}
          />
        </ManagementEditorSection>

        <ManagementActionBar>
          <Text size="sm" c={dirty ? "yellow.9" : "dimmed"}>
            {dirty ? "Unsaved editor changes" : "No editor changes"}
          </Text>
          <Group gap="xs">
            <Button variant="default" disabled={!canEditDraft || !dirty} onClick={discardLocalDraft}>
              Discard
            </Button>
            <Button variant="light" disabled={!canEditDraft || !dirty || !episodeCountValid} onClick={saveLocalDraft}>
              Save draft
            </Button>
            <Button disabled={!canSaveOverlay} loading={savingOverlay} onClick={() => void saveOverlay()}>
              Save to overlay
            </Button>
            <Button
              color="red"
              variant="light"
              disabled={!canHideCanonicalSeason}
              loading={hidingSeason}
              onClick={() => void hideSeason()}
            >
              Hide from my list
            </Button>
            <Button
              color="red"
              variant="outline"
              disabled={!canDeletePersonalSeason}
              loading={deletingSeason}
              onClick={() => void deletePersonalSeason()}
            >
              Delete personal season
            </Button>
            <Button
              color="red"
              variant="outline"
              disabled={!canRemoveLinkedImport}
              loading={deletingSeason}
              onClick={() => void removeLinkedImport()}
            >
              Remove link
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
        </ManagementActionBar>
        {locallySaved && (
          <Text size="sm" c="dimmed">
            Local draft saved.
          </Text>
        )}
      </Stack>

      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={2}>Episodes</Title>
          <Button
            size="xs"
            variant="light"
            disabled={!canAddEpisode}
            onClick={() =>
              void navigate({
                to: "/manage/show/$showId/season/$seasonId/episode/$episodeId",
                params: { showId: show.id, seasonId: season.id, episodeId: "new" },
              })
            }
          >
            Add episode
          </Button>
        </Group>
        <ScrollArea>
          <Table className="schedule-table" striped verticalSpacing="sm" miw={720}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={120}>Episode</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th w={180}>Air date</Table.Th>
                <Table.Th>Notes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {season.episodes.length > 0 ? (
                season.episodes.map((episode) => (
                  <Table.Tr key={episode.id}>
                    <Table.Td>
                      <Anchor
                        className="inline-link-button"
                        component="button"
                        type="button"
                        onClick={() =>
                          void navigate({
                            to: "/manage/show/$showId/season/$seasonId/episode/$episodeId",
                            params: { showId: show.id, seasonId: season.id, episodeId: episode.id },
                          })
                        }
                      >
                        {episode.episodeLabel || "Unknown"}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{episode.title || "Unknown"}</Table.Td>
                    <Table.Td>{episode.releaseDate || "Unknown"}</Table.Td>
                    <Table.Td>{episode.notes ?? ""}</Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed">{season.episodeCount == null ? "Episode count unknown" : emptyEpisodeText}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Stack>
  );
}

function seasonDraftFromPersonalRow(row: {
  dateConfidence: string;
  episodeCount: number | null;
  notes: string | null;
  organizations: unknown;
  externalLinks: unknown;
  finaleWindow: unknown;
  releasePattern: string | null;
  releaseKind: string;
  releasePrecision: string;
  releaseWindow: unknown;
  seasonLabel: string | null;
  seasonNumber: number | null;
  title: string | null;
  isFinal: boolean;
  section: string;
  sortKey: string | null;
  timing: string;
}): ManagementSeasonDraft {
  return {
    section: scheduleSection(row.section),
    seasonNumber: row.seasonNumber == null ? "" : String(row.seasonNumber),
    seasonLabel: row.seasonLabel ?? "",
    title: row.title ?? "",
    releaseKind:
      row.releaseKind === "special" ||
      row.releaseKind === "movie" ||
      row.releaseKind === "pilot" ||
      row.releaseKind === "other"
        ? row.releaseKind
        : "season",
    isFinal: row.isFinal,
    timing: row.timing,
    releasePattern: row.releasePattern ?? "",
    releaseWindowText: releaseWindowText(row.releaseWindow),
    finaleWindowText: releaseWindowText(row.finaleWindow),
    releasePrecision: row.releasePrecision,
    dateConfidence: row.dateConfidence,
    sortKey: row.sortKey ?? "",
    episodeCount: row.episodeCount == null ? "" : String(row.episodeCount),
    organizationsText: organizationRowsToText(row.organizations),
    linksText: externalLinksToText(row.externalLinks),
    notes: row.notes ?? "",
  };
}

function emptyManagementSeason(show: ManagementShow): ManagementSeason {
  const nextSeasonNumber = show.seasons.reduce((maximum, season) => Math.max(maximum, season.seasonNumber ?? 0), 0) + 1;
  return {
    id: newSeasonId,
    section: "upcoming",
    scheduleSection: "upcoming",
    seasonNumber: nextSeasonNumber,
    seasonLabel: `S${nextSeasonNumber}`,
    customSeasonLabel: null,
    title: null,
    releaseKind: "season",
    isFinal: false,
    timing: "",
    releasePattern: null,
    releasePrecision: "unknown",
    dateConfidence: "unknown",
    releaseWindow: null,
    finaleWindow: null,
    sortKey: null,
    organizationText: "",
    organizations: [],
    genreText: "",
    languages: [],
    countries: [],
    episodeCount: null,
    notes: null,
    links: [],
    episodes: [],
  };
}

function parseSeasonNumberDraft(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function scheduleSection(value: string): ManagementSeasonDraft["section"] {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

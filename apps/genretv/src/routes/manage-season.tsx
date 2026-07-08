import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import {
  Alert,
  Anchor,
  Badge,
  Button,
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
import {
  findManagementSeason,
  formatEpisodeCount,
  sectionLabels,
  type ManagementSeason,
  type ManagementShow,
} from "../domain/schedule";
import {
  parseEpisodeCountDraft,
  seasonDraftFromSeason,
  seasonDraftStorageKey,
  useManagementDraft,
  type ManagementSeasonDraft,
} from "../features/management/drafts";
import { canSendCanonicalProposal } from "../features/management/proposals";

const personalShow = genretvSyncRegistry.personal_show.view!;
const personalSeason = genretvSyncRegistry.personal_season.view!;
const newSeasonId = "new";

export function ManageSeasonRoute() {
  const { showId, seasonId } = useParams({ from: "/manage/show/$showId/season/$seasonId" });
  const { roles, session } = useAuth();
  const navigate = useNavigate();
  const { shows } = useManagementShows();
  const show = shows.find((candidate) => candidate.id === showId) ?? null;
  const result =
    seasonId === newSeasonId && show != null
      ? { show, season: emptyManagementSeason() }
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
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSent, setProposalSent] = useState(false);
  const status = season.section === "past" ? season.endedReason : sectionLabels[season.section];
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
          seasonLabel: personalSeason.seasonLabel,
          timing: personalSeason.timing,
          endedReason: personalSeason.endedReason,
          releasePattern: personalSeason.releasePattern,
          episodeCount: personalSeason.episodeCount,
          notes: personalSeason.notes,
        })
        .from(personalSeason)
        .where(or(eq(personalSeason.id, season.id), eq(personalSeason.canonicalSeasonId, season.id))),
    [season.id],
    { ready: canEdit },
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
  const initialDraft = useMemo(
    () => (personalRow == null ? seasonDraftFromSeason(season) : seasonDraftFromPersonalRow(personalRow)),
    [personalRow, season],
  );
  const { draft, dirty, locallySaved, setDraft, saveLocalDraft, discardLocalDraft } = useManagementDraft(
    seasonDraftStorageKey(season.id),
    initialDraft,
  );
  const draftEpisodeCount = parseEpisodeCountDraft(draft.episodeCount);
  const episodeCountValid = draft.episodeCount.trim() === "" || draftEpisodeCount != null;
  const emptyEpisodeText =
    season.episodeCount === 1 ? "1 episode, no row yet" : `${episodeCount} episodes, no rows yet`;
  const canSaveOverlay =
    canEdit && !personalSeasons.loading && !personalShows.loading && dirty && episodeCountValid && !savingOverlay;
  const canSubmitProposal =
    canEdit && canPropose && !personalSeasons.loading && !personalShows.loading && episodeCountValid && !proposalSaving;

  const saveOverlay = async () => {
    const createdId = personalRow?.id ?? crypto.randomUUID();
    const isPersonalOnlyShow = personalShowRow != null && personalShowRow.canonicalShowId == null;
    setSavingOverlay(true);
    setOverlayError(null);
    setOverlaySaved(false);
    try {
      const patch = {
        section: draft.section,
        seasonLabel: draft.seasonLabel.trim() || season.seasonLabel,
        timing: draft.timing.trim(),
        endedReason: draft.endedReason.trim(),
        releasePattern: nullableText(draft.releasePattern),
        episodeCount: draftEpisodeCount,
        notes: nullableText(draft.notes),
      };
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (personalRow == null) {
          tx.tables.personal_season.create({
            id: createdId,
            personalShowId: isPersonalOnlyShow ? show.id : null,
            canonicalShowId: isPersonalOnlyShow ? null : show.id,
            canonicalSeasonId: season.id === newSeasonId ? null : season.id,
            sourceRow: season.sourceRow,
            organizations: season.organizations.map((name) => ({ name, role: "unknown", externalLinks: [] })),
            externalLinks: [],
            ...patch,
          });
        } else {
          tx.tables.personal_season.update({ id: personalRow.id }, patch);
        }
      });
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
    const title = `${show.title} ${draft.seasonLabel.trim() || season.seasonLabel}`.trim();
    const isPersonalOnlySeason = personalRow != null && personalRow.canonicalSeasonId == null;
    const isPersonalOnlyShow = personalShowRow != null && personalShowRow.canonicalShowId == null;
    setProposalSaving(true);
    setProposalError(null);
    setProposalSent(false);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
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
            seasonLabel: draft.seasonLabel.trim() || season.seasonLabel,
            timing: draft.timing.trim(),
            endedReason: draft.endedReason.trim(),
            releasePattern: nullableText(draft.releasePattern),
            episodeCount: draftEpisodeCount,
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

      <Alert color={canEdit ? "teal" : "yellow"} variant="light">
        {canEdit
          ? "Save a browser-local draft while editing, or save this season-level metadata to your personal overlay."
          : "Sign in to create a browser-local management draft."}
      </Alert>
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
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label="Season"
            value={draft.seasonLabel}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, seasonLabel: event.currentTarget.value }))}
          />
          <Select
            label="Section"
            value={draft.section}
            disabled={!canEdit}
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
            disabled={!canEdit}
            error={!episodeCountValid ? "Use a whole number or leave blank" : null}
            onChange={(event) => setDraft((current) => ({ ...current, episodeCount: event.currentTarget.value }))}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label="When"
            value={draft.timing}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, timing: event.currentTarget.value }))}
          />
          <TextInput
            label="Release pattern"
            value={draft.releasePattern}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, releasePattern: event.currentTarget.value }))}
          />
          <TextInput
            label="Finished reason"
            value={draft.endedReason}
            disabled={!canEdit}
            onChange={(event) => setDraft((current) => ({ ...current, endedReason: event.currentTarget.value }))}
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
        <Group justify="space-between">
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
          <Group>
            <Button variant="default" disabled={!canEdit || !dirty} onClick={discardLocalDraft}>
              Discard
            </Button>
            <Button variant="light" disabled={!canEdit || !dirty || !episodeCountValid} onClick={saveLocalDraft}>
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
        <Group justify="space-between">
          <Title order={2}>Episodes</Title>
          <Button
            size="xs"
            variant="light"
            disabled={!canEdit}
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
  endedReason: string;
  episodeCount: number | null;
  notes: string | null;
  releasePattern: string | null;
  seasonLabel: string;
  section: string;
  timing: string;
}): ManagementSeasonDraft {
  return {
    section: scheduleSection(row.section),
    seasonLabel: row.seasonLabel,
    timing: row.timing,
    endedReason: row.endedReason,
    releasePattern: row.releasePattern ?? "",
    episodeCount: row.episodeCount == null ? "" : String(row.episodeCount),
    notes: row.notes ?? "",
  };
}

function emptyManagementSeason(): ManagementSeason {
  return {
    id: newSeasonId,
    section: "upcoming",
    seasonLabel: "S?",
    timing: "",
    endedReason: "",
    releasePattern: null,
    organizationText: "",
    organizations: [],
    genreText: "",
    languages: [],
    countries: [],
    sourceRow: 1_000_000,
    episodeCount: null,
    notes: null,
    episodes: [],
  };
}

function scheduleSection(value: string): ManagementSeasonDraft["section"] {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

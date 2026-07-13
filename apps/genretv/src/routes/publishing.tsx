import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import {
  Alert,
  Badge,
  Button,
  Group,
  Progress,
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
import { useMemo, useState } from "react";

import type { SyncTransaction } from "@pgxsinkit/client";

import { useAuth } from "../auth/auth";
import { useCanonicalSchedule } from "../domain/live-canonical-schedule";
import { buildManagementShows } from "../domain/schedule";
import { formatMicrosecondTimestamp } from "../domain/time";
import { buildCanonicalProposalMergePlan } from "../features/management/canonical-merge";
import {
  unreadNotificationIdsForCanonicalProposal,
  unreadNotificationIdsForPublishApplication,
} from "../features/management/notifications";
import {
  payloadRecord,
  ProposalPayloadReview,
  type ProposalPayloadReviewValue,
} from "../features/management/proposal-payload-review";
import { proposalReviewDiffRows, type ProposalReviewDiffRow } from "../features/management/proposal-review-diff";
import {
  canReviewWorkflowStatus,
  canPublishList,
  hasApprovedPublishApplication,
  hasOpenPublishApplication,
  workflowStatusColor,
} from "../features/management/proposals";
import { nextWorkflowReviewLabel, sortWorkflowReviewRows, workflowQueueSummary } from "../features/management/workflow";
import {
  ownPublishedLists as selectOwnPublishedLists,
  publishedSlugTakenByAnother,
} from "../features/publishing/ownership";
import {
  buildPublishedSnapshotPlan,
  filteredPublishedSnapshotSchedule,
  normalizePublishedSlug,
  type PublishedSnapshotPlan,
} from "../features/publishing/snapshots";

const publishApplication = genretvSyncRegistry.publish_application.view!;
const canonicalProposal = genretvSyncRegistry.canonical_proposal.view!;
const maintainerNotification = genretvSyncRegistry.maintainer_notification.view!;
const publishedList = genretvSyncRegistry.published_list.view!;
const workflowStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];
interface PublishProgress {
  completed: number;
  label: string;
  total: number;
}

type SyncWriteTransaction = SyncTransaction<typeof genretvSyncRegistry>;

export function PublishingRoute() {
  const { roles, session } = useAuth();
  const client = useSyncClient();
  const [message, setMessage] = useState("");
  const [listTitle, setListTitle] = useState("My GenreTV list");
  const [listSlug, setListSlug] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [publishFilter, setPublishFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishedSaved, setPublishedSaved] = useState(false);
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [applicationReviewNotes, setApplicationReviewNotes] = useState<Record<string, string>>({});
  const [proposalReviewNotes, setProposalReviewNotes] = useState<Record<string, string>>({});
  const [proposalReviewPayloads, setProposalReviewPayloads] = useState<Record<string, ProposalPayloadReviewValue>>({});
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("all");
  const [proposalStatusFilter, setProposalStatusFilter] = useState("all");
  const [proposalKindFilter, setProposalKindFilter] = useState("all");
  const isMaintainer = roles.includes("canonical_maintainer");
  const hasPublisherRole = canPublishList(roles);
  const canonical = useCanonicalSchedule();
  const managementShows = useMemo(() => buildManagementShows(canonical.schedule.entries), [canonical.schedule.entries]);
  const normalizedSlug = normalizePublishedSlug(listSlug);
  const applications = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: publishApplication.id,
          ownerId: publishApplication.ownerId,
          message: publishApplication.message,
          status: publishApplication.status,
          reviewerNote: publishApplication.reviewerNote,
          createdAtUs: publishApplication.createdAtUs,
          updatedAtUs: publishApplication.updatedAtUs,
        })
        .from(publishApplication),
    [],
    { ready: session != null },
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
    { ready: session != null },
  );
  const proposals = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: canonicalProposal.id,
          ownerId: canonicalProposal.ownerId,
          proposalKind: canonicalProposal.proposalKind,
          status: canonicalProposal.status,
          title: canonicalProposal.title,
          message: canonicalProposal.message,
          reviewerNote: canonicalProposal.reviewerNote,
          canonicalShowId: canonicalProposal.canonicalShowId,
          canonicalSeasonId: canonicalProposal.canonicalSeasonId,
          canonicalEpisodeId: canonicalProposal.canonicalEpisodeId,
          personalShowId: canonicalProposal.personalShowId,
          personalSeasonId: canonicalProposal.personalSeasonId,
          personalEpisodeId: canonicalProposal.personalEpisodeId,
          proposedPayload: canonicalProposal.proposedPayload,
          reviewedPayload: canonicalProposal.reviewedPayload,
          sourceKind: canonicalProposal.sourceKind,
          sourceUrl: canonicalProposal.sourceUrl,
          sourceObservedAtUs: canonicalProposal.sourceObservedAtUs,
          createdAtUs: canonicalProposal.createdAtUs,
          updatedAtUs: canonicalProposal.updatedAtUs,
        })
        .from(canonicalProposal),
    [],
    { ready: session != null },
  );
  const notifications = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: maintainerNotification.id,
          status: maintainerNotification.status,
          title: maintainerNotification.title,
          body: maintainerNotification.body,
          relatedPublishApplicationId: maintainerNotification.relatedPublishApplicationId,
          relatedCanonicalProposalId: maintainerNotification.relatedCanonicalProposalId,
          createdAtUs: maintainerNotification.createdAtUs,
        })
        .from(maintainerNotification),
    [],
    { ready: session != null && isMaintainer },
  );
  const matchingPublishedList = useMemo(
    () => publishedLists.rows.find((list) => list.slug === normalizedSlug) ?? null,
    [normalizedSlug, publishedLists.rows],
  );
  const userId = session?.user.id ?? null;
  const ownPublishedLists = useMemo(
    () => selectOwnPublishedLists(publishedLists.rows, userId),
    [publishedLists.rows, userId],
  );
  const ownApplications = useMemo(
    () => applications.rows.filter((application) => userId != null && application.ownerId === userId),
    [applications.rows, userId],
  );
  const ownProposals = useMemo(
    () => proposals.rows.filter((proposal) => userId != null && proposal.ownerId === userId),
    [proposals.rows, userId],
  );
  const applicationRows = useMemo(
    () => sortWorkflowReviewRows(isMaintainer ? applications.rows : ownApplications),
    [applications.rows, isMaintainer, ownApplications],
  );
  const proposalRows = useMemo(
    () => sortWorkflowReviewRows(isMaintainer ? proposals.rows : ownProposals),
    [isMaintainer, ownProposals, proposals.rows],
  );
  const visibleApplications = useMemo(
    () => applicationRows.filter((application) => matchesStatusFilter(application.status, applicationStatusFilter)),
    [applicationRows, applicationStatusFilter],
  );
  const visibleProposals = useMemo(
    () =>
      proposalRows.filter(
        (proposal) =>
          matchesStatusFilter(proposal.status, proposalStatusFilter) &&
          (proposalKindFilter === "all" || proposal.proposalKind === proposalKindFilter),
      ),
    [proposalKindFilter, proposalRows, proposalStatusFilter],
  );
  const openProposalTargetCounts = useMemo(() => openProposalTargetCountsFor(proposalRows), [proposalRows]);
  const notificationRows = useMemo(() => [...notifications.rows].sort(compareNotifications), [notifications.rows]);
  const openApplicationCount = useMemo(
    () => applicationRows.filter((application) => canReviewWorkflowStatus(application.status)).length,
    [applicationRows],
  );
  const openProposalCount = useMemo(
    () => proposalRows.filter((proposal) => canReviewWorkflowStatus(proposal.status)).length,
    [proposalRows],
  );
  const workflowCounts = useMemo(
    () => ({ openApplications: openApplicationCount, openProposals: openProposalCount }),
    [openApplicationCount, openProposalCount],
  );
  const reviewQueueSummary = workflowQueueSummary(workflowCounts);
  const nextReviewLabel = nextWorkflowReviewLabel(workflowCounts);
  const unreadNotificationCount = useMemo(
    () => notifications.rows.filter((notification) => notification.status === "unread").length,
    [notifications.rows],
  );
  const hasApprovedApplication = hasApprovedPublishApplication(ownApplications);
  const hasOpenApplication = hasOpenPublishApplication(ownApplications);
  const canPublish = hasPublisherRole || hasApprovedApplication;
  const snapshotSchedule = useMemo(
    () => filteredPublishedSnapshotSchedule(canonical.schedule, publishFilter),
    [canonical.schedule, publishFilter],
  );
  const canSubmitApplication = !saving && !applications.loading && !canPublish && !hasOpenApplication;
  const ownMatchingPublishedList =
    matchingPublishedList != null && userId != null && matchingPublishedList.ownerId === userId
      ? matchingPublishedList
      : null;
  const slugTakenBySomeoneElse = publishedSlugTakenByAnother(publishedLists.rows, normalizedSlug, userId);
  const canPublishSnapshot =
    canPublish &&
    normalizedSlug !== "" &&
    listTitle.trim() !== "" &&
    !slugTakenBySomeoneElse &&
    !canonical.loading &&
    snapshotSchedule.entries.length > 0 &&
    !saving;

  const submitApplication = async () => {
    const applicationId = crypto.randomUUID();
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        tx.tables.publish_application.create({
          id: applicationId,
          message: nullableText(message),
        });
      });
      setSaved(true);
      setMessage("");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const publishSnapshot = async () => {
    const listId = ownMatchingPublishedList?.id ?? crypto.randomUUID();
    const snapshotVersion = (ownMatchingPublishedList?.snapshotVersion ?? 0) + 1;
    const plan = buildPublishedSnapshotPlan(
      snapshotSchedule,
      {
        listId,
        slug: normalizedSlug,
        title: listTitle.trim(),
        description: nullableText(listDescription),
        snapshotVersion,
        nowUs: BigInt(Date.now()) * 1000n,
      },
      () => crypto.randomUUID(),
      { publicationStatus: "draft" },
    );
    const totalMutations = publishedSnapshotMutationCount(plan, ownMatchingPublishedList == null);
    let completedMutations = 0;
    const runStep = async (label: string, mutationCount: number, enqueue: (tx: SyncWriteTransaction) => void) => {
      setPublishProgress({ label, completed: completedMutations, total: totalMutations });
      await client.transaction({ mode: "optimistic" }, enqueue);
      completedMutations += mutationCount;
      setPublishProgress({ label, completed: completedMutations, total: totalMutations });
    };
    setSaving(true);
    setActionError(null);
    setSaved(false);
    setPublishedSaved(false);
    setPublishProgress({ label: "Preparing snapshot", completed: 0, total: totalMutations });
    try {
      if (ownMatchingPublishedList == null) {
        await runStep("Creating draft published list", 1, (tx) => {
          tx.tables.published_list.create({
            id: plan.list.id,
            slug: plan.list.slug,
            title: plan.list.title,
            description: plan.list.description,
            publicationStatus: plan.list.publicationStatus,
            snapshotVersion: plan.list.snapshotVersion,
          });
        });
      }
      await runStep(`Creating ${plan.shows.length} draft published shows`, plan.shows.length, (tx) => {
        for (const show of plan.shows) tx.tables.published_show.create(show);
      });
      await runStep(`Creating ${plan.seasons.length} draft published seasons`, plan.seasons.length, (tx) => {
        for (const season of plan.seasons) tx.tables.published_season.create(season);
      });
      if (plan.episodes.length > 0) {
        await runStep(`Creating ${plan.episodes.length} draft published episodes`, plan.episodes.length, (tx) => {
          for (const episode of plan.episodes) tx.tables.published_episode.create(episode);
        });
      }
      await runStep(`Publishing ${plan.shows.length} shows`, plan.shows.length, (tx) => {
        for (const show of plan.shows) {
          tx.tables.published_show.update({ id: show.id }, { publicationStatus: "published" });
        }
      });
      await runStep(`Publishing ${plan.seasons.length} seasons`, plan.seasons.length, (tx) => {
        for (const season of plan.seasons) {
          tx.tables.published_season.update({ id: season.id }, { publicationStatus: "published" });
        }
      });
      if (plan.episodes.length > 0) {
        await runStep(`Publishing ${plan.episodes.length} episodes`, plan.episodes.length, (tx) => {
          for (const episode of plan.episodes) {
            tx.tables.published_episode.update({ id: episode.id }, { publicationStatus: "published" });
          }
        });
      }
      await runStep("Publishing list snapshot", 1, (tx) => {
        if (ownMatchingPublishedList == null) {
          tx.tables.published_list.update(
            { id: listId },
            {
              publicationStatus: "published",
            },
          );
        } else {
          tx.tables.published_list.update(
            { id: listId },
            {
              title: plan.list.title,
              description: plan.list.description,
              publicationStatus: "published",
              snapshotVersion: plan.list.snapshotVersion,
            },
          );
        }
      });
      setPublishedSaved(true);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
      setPublishProgress(null);
    }
  };

  const updateApplicationStatus = async (id: string, status: "approved" | "rejected" | "closed", note: string) => {
    const notificationIds = unreadNotificationIdsForPublishApplication(notifications.rows, id);
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        tx.tables.publish_application.update({ id }, { status, reviewerNote: nullableText(note) });
        for (const notificationId of notificationIds) {
          tx.tables.maintainer_notification.update({ id: notificationId }, { status: "read" });
        }
      });
      setApplicationReviewNotes((notes) => withoutKey(notes, id));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const updateProposalStatus = async (id: string, status: "approved" | "rejected" | "closed", note: string) => {
    const notificationIds = unreadNotificationIdsForCanonicalProposal(notifications.rows, id);
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        tx.tables.canonical_proposal.update({ id }, { status, reviewerNote: nullableText(note) });
        for (const notificationId of notificationIds) {
          tx.tables.maintainer_notification.update({ id: notificationId }, { status: "read" });
        }
      });
      setProposalReviewNotes((notes) => withoutKey(notes, id));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const approveCanonicalProposal = async (
    proposal: {
      canonicalEpisodeId: string | null;
      canonicalSeasonId: string | null;
      canonicalShowId: string | null;
      id: string;
      proposalKind: string;
      proposedPayload: unknown;
      reviewedPayload: unknown;
      title: string;
    },
    note: string,
    reviewedPayload: Record<string, unknown>,
  ) => {
    const notificationIds = unreadNotificationIdsForCanonicalProposal(notifications.rows, proposal.id);
    const plan = buildCanonicalProposalMergePlan({ ...proposal, reviewedPayload }, () => crypto.randomUUID());
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        if (plan.showCreate != null) tx.tables.canonical_show.create(plan.showCreate);
        if (plan.showUpdate != null) tx.tables.canonical_show.update({ id: plan.showUpdate.id }, plan.showUpdate.patch);
        if (plan.seasonCreate != null) tx.tables.canonical_season.create(plan.seasonCreate);
        if (plan.seasonUpdate != null) {
          tx.tables.canonical_season.update({ id: plan.seasonUpdate.id }, plan.seasonUpdate.patch);
        }
        if (plan.episodeCreate != null) tx.tables.canonical_episode.create(plan.episodeCreate);
        if (plan.episodeUpdate != null) {
          tx.tables.canonical_episode.update({ id: plan.episodeUpdate.id }, plan.episodeUpdate.patch);
        }
        tx.tables.canonical_proposal.update(
          { id: proposal.id },
          { status: "approved", reviewerNote: nullableText(note), reviewedPayload },
        );
        for (const notificationId of notificationIds) {
          tx.tables.maintainer_notification.update({ id: notificationId }, { status: "read" });
        }
      });
      setProposalReviewNotes((notes) => withoutKey(notes, proposal.id));
      setProposalReviewPayloads((payloads) => withoutKey(payloads, proposal.id));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        tx.tables.maintainer_notification.update({ id }, { status: "read" });
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const markAllNotificationsRead = async () => {
    const notificationIds = notifications.rows
      .filter((notification) => notification.status === "unread")
      .map((notification) => notification.id);
    if (notificationIds.length === 0) return;
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        for (const id of notificationIds) {
          tx.tables.maintainer_notification.update({ id }, { status: "read" });
        }
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const showApplications = (status: string) => {
    setApplicationStatusFilter(status);
    scrollToHeading("publishing-applications-heading");
  };

  const showProposals = (status: string) => {
    setProposalStatusFilter(status);
    setProposalKindFilter("all");
    scrollToHeading("publishing-proposals-heading");
  };

  if (session == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={900} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Publishing</Title>
        <Alert color="yellow" variant="light">
          Sign in to apply to publish your list.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={1080} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Publishing</Title>
          <Text c="dimmed">Apply to publish your list or review incoming requests.</Text>
        </div>
        {isMaintainer && <Badge variant="light">Maintainer</Badge>}
      </Group>

      {applications.error != null && (
        <Alert color="red" variant="light">
          Could not load publish applications: {applications.error.message}
        </Alert>
      )}
      {publishedLists.error != null && (
        <Alert color="red" variant="light">
          Could not load published lists: {publishedLists.error.message}
        </Alert>
      )}
      {canonical.error != null && (
        <Alert color="red" variant="light">
          Could not load your current schedule for publishing: {canonical.error.message}
        </Alert>
      )}
      {proposals.error != null && (
        <Alert color="red" variant="light">
          Could not load canonical proposals: {proposals.error.message}
        </Alert>
      )}
      {notifications.error != null && (
        <Alert color="red" variant="light">
          Could not load maintainer notifications: {notifications.error.message}
        </Alert>
      )}
      {actionError != null && (
        <Alert color="red" variant="light">
          Could not save publishing workflow change: {actionError}
        </Alert>
      )}
      {saved && (
        <Alert color="teal" variant="light">
          Application saved locally and queued for synchronization.
        </Alert>
      )}
      {publishedSaved && (
        <Alert color="teal" variant="light">
          Publication saved locally and queued for synchronization.
        </Alert>
      )}
      {publishProgress != null && (
        <Alert color="blue" variant="light">
          <Stack gap={6}>
            <Text size="sm">
              {publishProgress.label}: {publishProgress.completed} of {publishProgress.total} writes saved locally.
            </Text>
            <Progress
              value={publishProgress.total === 0 ? 100 : (publishProgress.completed / publishProgress.total) * 100}
            />
          </Stack>
        </Alert>
      )}

      {isMaintainer && (
        <Stack gap="sm" component="section" aria-label="Maintainer review queue">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Review queue</Title>
              <Text size="sm" c="dimmed">
                {reviewQueueSummary}
              </Text>
              {nextReviewLabel != null && (
                <Text size="sm" c="dimmed">
                  {nextReviewLabel}
                </Text>
              )}
            </div>
          </Group>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Badge color={openApplicationCount > 0 ? "yellow" : "gray"} variant="light">
                {openApplicationCount} open applications
              </Badge>
              <Badge color={openProposalCount > 0 ? "yellow" : "gray"} variant="light">
                {openProposalCount} open proposals
              </Badge>
              <Badge color={unreadNotificationCount > 0 ? "yellow" : "gray"} variant="light">
                {unreadNotificationCount} unread notifications
              </Badge>
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="default"
                disabled={openApplicationCount === 0}
                onClick={() => showApplications("open")}
              >
                Review applications
              </Button>
              <Button
                size="xs"
                variant="default"
                disabled={openProposalCount === 0}
                onClick={() => showProposals("open")}
              >
                Review proposals
              </Button>
              <Button
                size="xs"
                variant="default"
                onClick={() => {
                  setApplicationStatusFilter("all");
                  setProposalStatusFilter("all");
                  setProposalKindFilter("all");
                }}
              >
                Show history
              </Button>
              <Button
                size="xs"
                variant="default"
                disabled={saving || unreadNotificationCount === 0}
                onClick={() => void markAllNotificationsRead()}
              >
                Mark all read
              </Button>
            </Group>
          </Group>
        </Stack>
      )}

      {canPublish ? (
        <Stack gap="sm" component="section" aria-labelledby="publish-snapshot-heading">
          <Title id="publish-snapshot-heading" order={2}>
            Publish snapshot
          </Title>
          {hasApprovedApplication && !hasPublisherRole && (
            <Alert color="teal" variant="light">
              Your publish application has been approved.
            </Alert>
          )}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Title" value={listTitle} onChange={(event) => setListTitle(event.currentTarget.value)} />
            <TextInput
              label="Slug"
              value={listSlug}
              error={slugTakenBySomeoneElse ? "That slug is already published by another user" : null}
              onChange={(event) => setListSlug(event.currentTarget.value)}
            />
          </SimpleGrid>
          <Textarea
            label="Description"
            autosize
            minRows={3}
            value={listDescription}
            onChange={(event) => setListDescription(event.currentTarget.value)}
          />
          <TextInput
            label="Publish filter"
            value={publishFilter}
            onChange={(event) => setPublishFilter(event.currentTarget.value)}
          />
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              {ownMatchingPublishedList == null
                ? `${seasonRowsLabel(snapshotSchedule.allEntries.length)} will be published as a new list.`
                : `${seasonRowsLabel(snapshotSchedule.allEntries.length)} will become snapshot v${
                    ownMatchingPublishedList.snapshotVersion + 1
                  } for ${ownMatchingPublishedList.slug}.`}
            </Text>
            <Button loading={saving} disabled={!canPublishSnapshot} onClick={() => void publishSnapshot()}>
              Publish snapshot
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="sm" component="section" aria-labelledby="apply-to-publish-heading">
          <Title id="apply-to-publish-heading" order={2}>
            Apply to publish
          </Title>
          {hasOpenApplication && (
            <Alert color="yellow" variant="light">
              Your publish application is waiting for maintainer review.
            </Alert>
          )}
          <Textarea
            label="Message"
            autosize
            minRows={4}
            value={message}
            disabled={hasOpenApplication}
            onChange={(event) => setMessage(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button loading={saving} disabled={!canSubmitApplication} onClick={() => void submitApplication()}>
              Apply to publish
            </Button>
          </Group>
        </Stack>
      )}

      {canPublish && (
        <Stack gap="sm" component="section" aria-labelledby="publishing-own-lists-heading">
          <Title id="publishing-own-lists-heading" order={2}>
            Published lists
          </Title>
          <ScrollArea>
            <Table className="schedule-table" striped verticalSpacing="sm" miw={760}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Slug</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Version</Table.Th>
                  <Table.Th>Updated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ownPublishedLists.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed">No published lists yet.</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  ownPublishedLists.map((list) => (
                    <Table.Tr key={list.id}>
                      <Table.Td>{list.slug}</Table.Td>
                      <Table.Td>{list.title}</Table.Td>
                      <Table.Td>
                        <Badge color={workflowStatusColor(list.publicationStatus)} variant="light">
                          {list.publicationStatus}
                        </Badge>
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

      <Stack gap="sm" component="section" aria-labelledby="publishing-applications-heading">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title id="publishing-applications-heading" order={2}>
              {isMaintainer ? "Applications" : "Your applications"}
            </Title>
            <Text size="sm" c="dimmed">
              {visibleApplications.length} of {applicationRows.length}
            </Text>
          </div>
          <Select
            label="Status"
            value={applicationStatusFilter}
            data={workflowStatusOptions}
            onChange={(value) => setApplicationStatusFilter(value ?? "all")}
          />
        </Group>
        <ScrollArea>
          <Table className="schedule-table" striped verticalSpacing="sm" miw={760}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Updated</Table.Th>
                {isMaintainer && <Table.Th>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleApplications.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isMaintainer ? 4 : 3}>
                    <Text c="dimmed">
                      {applicationRows.length === 0 ? "No applications yet." : "No applications match these filters."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                visibleApplications.map((application) => {
                  const reviewNote = applicationReviewNotes[application.id] ?? application.reviewerNote ?? "";
                  const canReviewApplication = canReviewWorkflowStatus(application.status);
                  return (
                    <Table.Tr key={application.id}>
                      <Table.Td>
                        <Badge color={workflowStatusColor(application.status)} variant="light">
                          {application.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="sm">{application.message ?? ""}</Text>
                          {application.reviewerNote != null && (
                            <Text size="xs" c="dimmed">
                              Reviewer note: {application.reviewerNote}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>{formatMicroseconds(application.updatedAtUs)}</Table.Td>
                      {isMaintainer && (
                        <Table.Td>
                          <Stack gap="xs">
                            <Textarea
                              aria-label="Publish application reviewer note"
                              autosize
                              minRows={2}
                              placeholder="Optional note"
                              disabled={!canReviewApplication}
                              value={reviewNote}
                              onChange={(event) => {
                                const reviewNote = event.currentTarget.value;
                                setApplicationReviewNotes((notes) => ({
                                  ...notes,
                                  [application.id]: reviewNote,
                                }));
                              }}
                            />
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                disabled={saving || !canReviewApplication}
                                onClick={() => void updateApplicationStatus(application.id, "approved", reviewNote)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                disabled={saving || !canReviewApplication}
                                onClick={() => void updateApplicationStatus(application.id, "rejected", reviewNote)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="xs"
                                variant="default"
                                disabled={saving || !canReviewApplication}
                                onClick={() => void updateApplicationStatus(application.id, "closed", reviewNote)}
                              >
                                Close
                              </Button>
                            </Group>
                          </Stack>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>

      <Stack gap="sm" component="section" aria-labelledby="publishing-proposals-heading">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title id="publishing-proposals-heading" order={2}>
              {isMaintainer ? "Canonical proposals" : "Your canonical proposals"}
            </Title>
            <Text size="sm" c="dimmed">
              {visibleProposals.length} of {proposalRows.length}
            </Text>
          </div>
          <Group align="flex-end">
            <Select
              label="Status"
              value={proposalStatusFilter}
              data={workflowStatusOptions}
              onChange={(value) => setProposalStatusFilter(value ?? "all")}
            />
            <Select
              label="Kind"
              value={proposalKindFilter}
              data={[
                { value: "all", label: "All kinds" },
                { value: "show", label: "Shows" },
                { value: "season", label: "Seasons" },
                { value: "episode", label: "Episodes" },
              ]}
              onChange={(value) => setProposalKindFilter(value ?? "all")}
            />
          </Group>
        </Group>
        <ScrollArea>
          <Table className="schedule-table" striped verticalSpacing="sm" miw={900}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Status</Table.Th>
                <Table.Th>Kind</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Updated</Table.Th>
                {isMaintainer && <Table.Th>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibleProposals.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isMaintainer ? 6 : 5}>
                    <Text c="dimmed">
                      {proposalRows.length === 0 ? "No canonical proposals yet." : "No proposals match these filters."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                visibleProposals.map((proposal) => {
                  const reviewNote = proposalReviewNotes[proposal.id] ?? proposal.reviewerNote ?? "";
                  const reviewPayload = proposalReviewPayloads[proposal.id] ?? {
                    payload: payloadRecord(proposal.proposedPayload),
                    valid: Object.keys(payloadRecord(proposal.proposedPayload)).length > 0,
                  };
                  const payloadDetails = proposalPayloadDetails(proposal.proposedPayload);
                  const canReviewProposal = canReviewWorkflowStatus(proposal.status);
                  const proposalTargetKey = proposalReviewTargetKey(proposal);
                  const duplicateOpenTarget =
                    proposal.status === "open" &&
                    proposalTargetKey != null &&
                    (openProposalTargetCounts.get(proposalTargetKey) ?? 0) > 1;
                  return (
                    <Table.Tr key={proposal.id}>
                      <Table.Td>
                        <Badge color={workflowStatusColor(proposal.status)} variant="light">
                          {proposal.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline">{proposal.proposalKind}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700}>{proposal.title}</Text>
                        <Text size="xs" c="dimmed">
                          {proposalTargetText(proposal)}
                        </Text>
                        {duplicateOpenTarget && (
                          <Badge color="yellow" variant="light">
                            Duplicate open target
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="sm">{proposal.message ?? proposalPayloadSummary(proposal.proposedPayload)}</Text>
                          <ProposalReviewDiff
                            proposal={proposal}
                            shows={managementShows}
                            fallbackDetails={payloadDetails}
                          />
                          {proposal.sourceKind != null && (
                            <Text size="xs" c="dimmed">
                              Source: {proposal.sourceUrl ?? proposal.sourceKind}
                              {proposal.sourceObservedAtUs == null
                                ? ""
                                : ` · observed ${formatMicroseconds(proposal.sourceObservedAtUs)}`}
                            </Text>
                          )}
                          {isMaintainer && canReviewProposal && (
                            <details>
                              <summary>Review accepted fields</summary>
                              <ProposalPayloadReview
                                proposedPayload={proposal.proposedPayload}
                                onChange={(value) =>
                                  setProposalReviewPayloads((payloads) => ({ ...payloads, [proposal.id]: value }))
                                }
                              />
                            </details>
                          )}
                          {proposal.status === "approved" && proposal.reviewedPayload != null && (
                            <Text size="xs" c="dimmed">
                              Accepted fields: {Object.keys(payloadRecord(proposal.reviewedPayload)).join(", ")}
                            </Text>
                          )}
                          {proposal.reviewerNote != null && (
                            <Text size="xs" c="dimmed">
                              Reviewer note: {proposal.reviewerNote}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>{formatMicroseconds(proposal.updatedAtUs)}</Table.Td>
                      {isMaintainer && (
                        <Table.Td>
                          <Stack gap="xs">
                            <Textarea
                              aria-label="Canonical proposal reviewer note"
                              autosize
                              minRows={2}
                              placeholder="Optional note"
                              disabled={!canReviewProposal}
                              value={reviewNote}
                              onChange={(event) => {
                                const reviewNote = event.currentTarget.value;
                                setProposalReviewNotes((notes) => ({
                                  ...notes,
                                  [proposal.id]: reviewNote,
                                }));
                              }}
                            />
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                disabled={saving || !canReviewProposal || !reviewPayload.valid}
                                onClick={() =>
                                  void approveCanonicalProposal(proposal, reviewNote, reviewPayload.payload)
                                }
                              >
                                Approve + merge
                              </Button>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                disabled={saving || !canReviewProposal}
                                onClick={() => void updateProposalStatus(proposal.id, "rejected", reviewNote)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="xs"
                                variant="default"
                                disabled={saving || !canReviewProposal}
                                onClick={() => void updateProposalStatus(proposal.id, "closed", reviewNote)}
                              >
                                Close
                              </Button>
                            </Group>
                          </Stack>
                        </Table.Td>
                      )}
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>

      {isMaintainer && (
        <Stack gap="sm" component="section" aria-labelledby="publishing-notifications-heading">
          <Title id="publishing-notifications-heading" order={2}>
            Notifications
          </Title>
          {notificationRows.length === 0 ? (
            <Text c="dimmed">No maintainer notifications yet.</Text>
          ) : (
            notificationRows.map((notification) => (
              <Alert key={notification.id} color={notification.status === "unread" ? "yellow" : "gray"} variant="light">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text fw={700}>{notification.title}</Text>
                    <Text size="sm">{notification.body ?? ""}</Text>
                    <Text size="xs" c="dimmed">
                      {formatMicroseconds(notification.createdAtUs)}
                    </Text>
                    <NotificationTargetText
                      applications={applicationRows}
                      notification={notification}
                      proposals={proposalRows}
                    />
                  </Stack>
                  <Group gap="xs">
                    <NotificationTargetButton
                      applications={applicationRows}
                      notification={notification}
                      proposals={proposalRows}
                      showApplications={showApplications}
                      showProposals={showProposals}
                    />
                    {notification.status === "unread" && (
                      <Button
                        size="xs"
                        variant="default"
                        disabled={saving}
                        onClick={() => void markNotificationRead(notification.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </Group>
                </Group>
              </Alert>
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}

interface NotificationTargetApplication {
  id: string;
  message: string | null;
  status: string;
}

interface NotificationTargetProposal {
  id: string;
  status: string;
  title: string;
}

interface ReviewDiffProposal {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  proposalKind: string;
  proposedPayload: unknown;
}

interface NotificationTargetNotification {
  relatedCanonicalProposalId: string | null;
  relatedPublishApplicationId: string | null;
}

interface NotificationTarget {
  buttonLabel: string;
  kind: "application" | "proposal";
  label: string;
  status: string;
}

function ProposalReviewDiff({
  fallbackDetails,
  proposal,
  shows,
}: {
  fallbackDetails: readonly string[];
  proposal: ReviewDiffProposal;
  shows: ReturnType<typeof buildManagementShows>;
}) {
  const rows = proposalReviewDiffRows(proposal, shows)
    .filter((row) => row.status !== "unchanged")
    .slice(0, 8);
  if (rows.length === 0) {
    if (fallbackDetails.length === 0) return null;
    return (
      <Stack gap={2}>
        {fallbackDetails.map((detail) => (
          <Text key={detail} size="xs" c="dimmed">
            {detail}
          </Text>
        ))}
      </Stack>
    );
  }
  return (
    <Stack className="proposal-review-diff" gap={4} aria-label="Proposal review diff">
      {rows.map((row) => (
        <ProposalReviewDiffItem key={`${row.field}-${row.current}-${row.proposed}`} row={row} />
      ))}
    </Stack>
  );
}

function ProposalReviewDiffItem({ row }: { row: ProposalReviewDiffRow }) {
  return (
    <Group className="proposal-review-diff-row" gap="xs" align="center" wrap="nowrap">
      <Text className="proposal-review-diff-field" size="xs" fw={700}>
        {row.field}
      </Text>
      <Text className="proposal-review-diff-value" size="xs" c="dimmed">
        {row.current}
      </Text>
      <Text size="xs" c="dimmed">
        -&gt;
      </Text>
      <Text className="proposal-review-diff-value" size="xs">
        {row.proposed}
      </Text>
      <Badge size="xs" color={row.status === "new" ? "blue" : "yellow"} variant="light">
        {row.status}
      </Badge>
    </Group>
  );
}

function NotificationTargetText({
  applications,
  notification,
  proposals,
}: {
  applications: readonly NotificationTargetApplication[];
  notification: NotificationTargetNotification;
  proposals: readonly NotificationTargetProposal[];
}) {
  const target = notificationTarget(notification, applications, proposals);
  if (target == null) return null;
  return (
    <Text size="xs" c="dimmed">
      Target: {target.label} ({target.status})
    </Text>
  );
}

function NotificationTargetButton({
  applications,
  notification,
  proposals,
  showApplications,
  showProposals,
}: {
  applications: readonly NotificationTargetApplication[];
  notification: NotificationTargetNotification;
  proposals: readonly NotificationTargetProposal[];
  showApplications: (status: string) => void;
  showProposals: (status: string) => void;
}) {
  const target = notificationTarget(notification, applications, proposals);
  if (target == null) return null;
  return (
    <Button
      size="xs"
      variant="light"
      onClick={() => {
        if (target.kind === "application") showApplications(target.status);
        else showProposals(target.status);
      }}
    >
      {target.buttonLabel}
    </Button>
  );
}

function notificationTarget(
  notification: NotificationTargetNotification,
  applications: readonly NotificationTargetApplication[],
  proposals: readonly NotificationTargetProposal[],
): NotificationTarget | null {
  if (notification.relatedPublishApplicationId != null) {
    const application = applications.find((row) => row.id === notification.relatedPublishApplicationId);
    if (application == null) return null;
    return {
      buttonLabel: application.status === "open" ? "Review application" : "Show application",
      kind: "application",
      label: application.message?.trim() || "Publisher application",
      status: application.status,
    };
  }
  if (notification.relatedCanonicalProposalId != null) {
    const proposal = proposals.find((row) => row.id === notification.relatedCanonicalProposalId);
    if (proposal == null) return null;
    return {
      buttonLabel: proposal.status === "open" ? "Review proposal" : "Show proposal",
      kind: "proposal",
      label: proposal.title,
      status: proposal.status,
    };
  }
  return null;
}

function scrollToHeading(id: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _discarded, ...rest } = record;
  return rest;
}

function publishedSnapshotMutationCount(plan: PublishedSnapshotPlan, createsList: boolean): number {
  return (
    (createsList ? 1 : 0) +
    plan.shows.length +
    plan.seasons.length +
    plan.episodes.length +
    plan.shows.length +
    plan.seasons.length +
    plan.episodes.length +
    1
  );
}

const formatMicroseconds = formatMicrosecondTimestamp;

function proposalTargetText(proposal: {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  personalEpisodeId: string | null;
  personalSeasonId: string | null;
  personalShowId: string | null;
}): string {
  if (proposal.canonicalEpisodeId != null) return "Canonical episode";
  if (proposal.canonicalSeasonId != null) return "Canonical season";
  if (proposal.canonicalShowId != null) return "Canonical show";
  if (proposal.personalEpisodeId != null) return "Personal episode";
  if (proposal.personalSeasonId != null) return "Personal season";
  if (proposal.personalShowId != null) return "Personal show";
  return "New canonical entry";
}

function openProposalTargetCountsFor(
  proposals: readonly {
    canonicalEpisodeId: string | null;
    canonicalSeasonId: string | null;
    canonicalShowId: string | null;
    personalEpisodeId: string | null;
    personalSeasonId: string | null;
    personalShowId: string | null;
    proposalKind: string;
    status: string;
    title: string;
  }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const proposal of proposals) {
    if (proposal.status !== "open") continue;
    const key = proposalReviewTargetKey(proposal);
    if (key == null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function proposalReviewTargetKey(proposal: {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  personalEpisodeId: string | null;
  personalSeasonId: string | null;
  personalShowId: string | null;
  proposalKind: string;
  title: string;
}): string | null {
  if (proposal.canonicalEpisodeId != null) return `canonical-episode:${proposal.canonicalEpisodeId}`;
  if (proposal.canonicalSeasonId != null) return `canonical-season:${proposal.canonicalSeasonId}`;
  if (proposal.canonicalShowId != null) return `canonical-show:${proposal.canonicalShowId}`;
  if (proposal.personalEpisodeId != null) return `personal-episode:${proposal.personalEpisodeId}`;
  if (proposal.personalSeasonId != null) return `personal-season:${proposal.personalSeasonId}`;
  if (proposal.personalShowId != null) return `personal-show:${proposal.personalShowId}`;
  const title = proposal.title.trim().toLocaleLowerCase();
  return title === "" ? null : `new:${proposal.proposalKind}:${title}`;
}

function proposalPayloadSummary(value: unknown): string {
  if (!isRecord(value)) return "";
  const fields = ["displayTitle", "seasonLabel", "episodeLabel", "title", "showTitle"]
    .map((key) => value[key])
    .filter((item): item is string => typeof item === "string" && item.trim() !== "");
  return fields.join(" · ");
}

function proposalPayloadDetails(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const kind = textValue(value["kind"]);
  if (kind === "show") return showProposalDetails(value);
  if (kind === "season") return seasonProposalDetails(value);
  if (kind === "episode") return episodeProposalDetails(value);
  return genericProposalDetails(value);
}

function showProposalDetails(value: Record<string, unknown>): string[] {
  return compactStrings([
    labelled("Title", textValue(value["displayTitle"])),
    labelled("Original", textValue(value["originalTitle"])),
    labelled("Languages", stringList(value["languages"])),
    labelled("Countries", stringList(value["countries"])),
    labelled("Genres", stringList(value["genreTags"])),
    labelledCount("Links", value["externalLinks"]),
  ]);
}

function seasonProposalDetails(value: Record<string, unknown>): string[] {
  return compactStrings([
    labelled("Show", textValue(value["showTitle"])),
    labelled("Season", textValue(value["seasonLabel"])),
    labelled("Section", textValue(value["section"])),
    labelled("Timing", textValue(value["timing"])),
    labelled("Release", releaseWindowSummary(value["releaseWindow"])),
    labelled("Finale", releaseWindowSummary(value["finaleWindow"])),
    labelled("Precision", textValue(value["releasePrecision"])),
    labelled("Confidence", textValue(value["dateConfidence"])),
    labelled("Episodes", numberValue(value["episodeCount"])),
    labelled("Sort", textValue(value["sortKey"])),
    labelledCount("Organizations", value["organizations"]),
    labelledCount("Links", value["externalLinks"]),
  ]);
}

function episodeProposalDetails(value: Record<string, unknown>): string[] {
  return compactStrings([
    labelled("Show", textValue(value["showTitle"])),
    labelled("Season", textValue(value["seasonLabel"])),
    labelled("Episode", textValue(value["episodeLabel"])),
    labelled("Title", textValue(value["title"])),
    labelled("Release", releaseWindowSummary(value["releaseWindow"])),
    labelled("Sort", textValue(value["sortKey"])),
    labelled("Parent release", releaseWindowSummary(value["seasonReleaseWindow"])),
    labelled("Parent finale", releaseWindowSummary(value["finaleWindow"])),
    labelledCount("Links", value["externalLinks"]),
  ]);
}

function genericProposalDetails(value: Record<string, unknown>): string[] {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      if (key === "kind") return [];
      if (typeof item === "string" && item.trim() !== "") return [`${key}: ${item.trim()}`];
      if (typeof item === "number") return [`${key}: ${item}`];
      if (Array.isArray(item)) return [`${key}: ${item.length}`];
      return [];
    })
    .slice(0, 8);
}

function releaseWindowSummary(value: unknown): string | null {
  if (!isRecord(value) || typeof value["raw"] !== "string" || value["raw"].trim() === "") return null;
  const raw = value["raw"].trim();
  const precision = textValue(value["precision"]);
  const confidence = textValue(value["confidence"]);
  return [raw, precision, confidence].filter((item) => item != null && item !== "unknown").join(" · ");
}

function labelled(label: string, value: string | null): string | null {
  return value == null ? null : `${label}: ${value}`;
}

function labelledCount(label: string, value: unknown): string | null {
  return Array.isArray(value) && value.length > 0 ? `${label}: ${value.length}` : null;
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function numberValue(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}

function stringList(value: unknown): string | null {
  const values = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return values.length > 0 ? values.join(", ") : null;
}

function compactStrings(values: Array<string | null>): string[] {
  return values.filter((value): value is string => value != null);
}

function matchesStatusFilter(status: string, filter: string): boolean {
  return filter === "all" || status === filter;
}

function seasonRowsLabel(count: number): string {
  return `${count} ${count === 1 ? "season" : "seasons"}`;
}

function compareNotifications(
  left: { createdAtUs: bigint; status: string },
  right: { createdAtUs: bigint; status: string },
): number {
  if (left.status === "unread" && right.status !== "unread") return -1;
  if (left.status !== "unread" && right.status === "unread") return 1;
  return Number(right.createdAtUs - left.createdAtUs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import {
  Alert,
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
import { useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { useCanonicalSchedule } from "../domain/live-canonical-schedule";
import { buildCanonicalProposalMergePlan } from "../features/management/canonical-merge";
import {
  unreadNotificationIdsForCanonicalProposal,
  unreadNotificationIdsForPublishApplication,
} from "../features/management/notifications";
import {
  canPublishList,
  hasApprovedPublishApplication,
  hasOpenPublishApplication,
  workflowStatusColor,
} from "../features/management/proposals";
import {
  ownPublishedLists as selectOwnPublishedLists,
  publishedSlugTakenByAnother,
} from "../features/publishing/ownership";
import { buildPublishedSnapshotPlan, normalizePublishedSlug } from "../features/publishing/snapshots";

const publishApplication = genretvSyncRegistry.publish_application.view!;
const canonicalProposal = genretvSyncRegistry.canonical_proposal.view!;
const maintainerNotification = genretvSyncRegistry.maintainer_notification.view!;
const publishedList = genretvSyncRegistry.published_list.view!;

export function PublishingRoute() {
  const { roles, session } = useAuth();
  const client = useSyncClient();
  const [message, setMessage] = useState("");
  const [listTitle, setListTitle] = useState("My GenreTV list");
  const [listSlug, setListSlug] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishedSaved, setPublishedSaved] = useState(false);
  const [applicationReviewNotes, setApplicationReviewNotes] = useState<Record<string, string>>({});
  const [proposalReviewNotes, setProposalReviewNotes] = useState<Record<string, string>>({});
  const isMaintainer = roles.includes("canonical_maintainer");
  const hasPublisherRole = canPublishList(roles);
  const canonical = useCanonicalSchedule();
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
  const hasApprovedApplication = hasApprovedPublishApplication(ownApplications);
  const hasOpenApplication = hasOpenPublishApplication(ownApplications);
  const canPublish = hasPublisherRole || hasApprovedApplication;
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
    canonical.schedule.entries.length > 0 &&
    !saving;

  const submitApplication = async () => {
    const applicationId = crypto.randomUUID();
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.publish_application.create({
          id: applicationId,
          message: nullableText(message),
        });
        tx.tables.maintainer_notification.create({
          id: crypto.randomUUID(),
          notificationKind: "publish_application",
          status: "unread",
          title: "Publisher application",
          body: nullableText(message),
          relatedPublishApplicationId: applicationId,
          relatedCanonicalProposalId: null,
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
      canonical.schedule,
      {
        listId,
        slug: normalizedSlug,
        title: listTitle.trim(),
        description: nullableText(listDescription),
        snapshotVersion,
        nowUs: BigInt(Date.now()) * 1000n,
      },
      () => crypto.randomUUID(),
    );
    setSaving(true);
    setActionError(null);
    setSaved(false);
    setPublishedSaved(false);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (ownMatchingPublishedList == null) {
          tx.tables.published_list.create(plan.list);
        } else {
          tx.tables.published_list.update(
            { id: ownMatchingPublishedList.id },
            {
              title: plan.list.title,
              description: plan.list.description,
              publicationStatus: plan.list.publicationStatus,
              snapshotVersion: plan.list.snapshotVersion,
              publishedAtUs: plan.list.publishedAtUs,
            },
          );
        }
        for (const show of plan.shows) tx.tables.published_show.create(show);
        for (const season of plan.seasons) tx.tables.published_season.create(season);
        for (const episode of plan.episodes) tx.tables.published_episode.create(episode);
      });
      setPublishedSaved(true);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const updateApplicationStatus = async (id: string, status: "approved" | "rejected" | "closed", note: string) => {
    const notificationIds = unreadNotificationIdsForPublishApplication(notifications.rows, id);
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
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
      await client.transaction({ mode: "pessimistic" }, (tx) => {
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
      title: string;
    },
    note: string,
  ) => {
    const notificationIds = unreadNotificationIdsForCanonicalProposal(notifications.rows, proposal.id);
    const plan = buildCanonicalProposalMergePlan(proposal, () => crypto.randomUUID());
    setSaving(true);
    setActionError(null);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
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
          { status: "approved", reviewerNote: nullableText(note) },
        );
        for (const notificationId of notificationIds) {
          tx.tables.maintainer_notification.update({ id: notificationId }, { status: "read" });
        }
      });
      setProposalReviewNotes((notes) => withoutKey(notes, proposal.id));
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
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.maintainer_notification.update({ id }, { status: "read" });
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
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
          Application sent.
        </Alert>
      )}
      {publishedSaved && (
        <Alert color="teal" variant="light">
          Published snapshot saved.
        </Alert>
      )}

      {canPublish ? (
        <Stack gap="sm">
          <Title order={2}>Publish snapshot</Title>
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
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              {ownMatchingPublishedList == null
                ? `${canonical.schedule.entries.length} seasons will be published as a new list.`
                : `${canonical.schedule.entries.length} seasons will become snapshot v${
                    ownMatchingPublishedList.snapshotVersion + 1
                  } for ${ownMatchingPublishedList.slug}.`}
            </Text>
            <Button loading={saving} disabled={!canPublishSnapshot} onClick={() => void publishSnapshot()}>
              Publish snapshot
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="sm">
          <Title order={2}>Apply to publish</Title>
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
        <Stack gap="sm">
          <Title order={2}>Published lists</Title>
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

      <Stack gap="sm">
        <Title order={2}>{isMaintainer ? "Applications" : "Your applications"}</Title>
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
              {applications.rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isMaintainer ? 4 : 3}>
                    <Text c="dimmed">No applications yet.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                applications.rows.map((application) => {
                  const reviewNote = applicationReviewNotes[application.id] ?? application.reviewerNote ?? "";
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
                              value={reviewNote}
                              onChange={(event) =>
                                setApplicationReviewNotes((notes) => ({
                                  ...notes,
                                  [application.id]: event.currentTarget.value,
                                }))
                              }
                            />
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                disabled={saving}
                                onClick={() => void updateApplicationStatus(application.id, "approved", reviewNote)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                disabled={saving}
                                onClick={() => void updateApplicationStatus(application.id, "rejected", reviewNote)}
                              >
                                Reject
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

      <Stack gap="sm">
        <Title order={2}>{isMaintainer ? "Canonical proposals" : "Your canonical proposals"}</Title>
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
              {proposals.rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={isMaintainer ? 6 : 5}>
                    <Text c="dimmed">No canonical proposals yet.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                proposals.rows.map((proposal) => {
                  const reviewNote = proposalReviewNotes[proposal.id] ?? proposal.reviewerNote ?? "";
                  const payloadDetails = proposalPayloadDetails(proposal.proposedPayload);
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
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="sm">{proposal.message ?? proposalPayloadSummary(proposal.proposedPayload)}</Text>
                          {payloadDetails.length > 0 && (
                            <Stack gap={2}>
                              {payloadDetails.map((detail) => (
                                <Text key={detail} size="xs" c="dimmed">
                                  {detail}
                                </Text>
                              ))}
                            </Stack>
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
                              value={reviewNote}
                              onChange={(event) =>
                                setProposalReviewNotes((notes) => ({
                                  ...notes,
                                  [proposal.id]: event.currentTarget.value,
                                }))
                              }
                            />
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                disabled={saving}
                                onClick={() => void approveCanonicalProposal(proposal, reviewNote)}
                              >
                                Approve + merge
                              </Button>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                disabled={saving}
                                onClick={() => void updateProposalStatus(proposal.id, "rejected", reviewNote)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="xs"
                                variant="default"
                                disabled={saving}
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
        <Stack gap="sm">
          <Title order={2}>Notifications</Title>
          {notifications.rows.length === 0 ? (
            <Text c="dimmed">No maintainer notifications yet.</Text>
          ) : (
            notifications.rows.map((notification) => (
              <Alert key={notification.id} color={notification.status === "unread" ? "yellow" : "gray"} variant="light">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={700}>{notification.title}</Text>
                    <Text size="sm">{notification.body ?? ""}</Text>
                    {notification.relatedCanonicalProposalId != null && (
                      <Text size="xs" c="dimmed">
                        Proposal {notification.relatedCanonicalProposalId}
                      </Text>
                    )}
                  </div>
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
              </Alert>
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _discarded, ...rest } = record;
  return rest;
}

function formatMicroseconds(value: bigint): string {
  const millis = Number(value / 1000n);
  return Number.isFinite(millis) ? new Date(millis).toLocaleString() : "";
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

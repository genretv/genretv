import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { count } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { getJournalTable } from "@pgxsinkit/client";
import type { SyncRuntimeStatus, SyncTableName } from "@pgxsinkit/contracts";

export type GenretvSyncTable = SyncTableName<typeof genretvSyncRegistry>;

export interface LocalMutationState {
  attemptCount: number;
  conflictReason: string | null;
  enqueuedAtUs: string;
  entityKey: Record<string, string>;
  lastError: string | null;
  lastHttpStatus: number | null;
  mutationId: string;
  mutationKind: string;
  mutationSeq: number;
  nextRetryAtUs: string | null;
  status: string;
  table: GenretvSyncTable;
}

interface SyncSummary {
  acked: number;
  conflicted: number;
  failed: number;
  pending: number;
  quarantined: number;
  rejected: number;
  sending: number;
  total: number;
}

interface SyncStatusValue {
  loading: boolean;
  online: boolean;
  runtime: SyncRuntimeStatus;
  summary: SyncSummary;
}

interface MutationDetails {
  loading: boolean;
  mutations: readonly LocalMutationState[];
}

interface MutationStatusCount {
  count: number;
  status: string;
}

const canonicalShowJournal = getJournalTable(genretvSyncRegistry, "canonical_show");
const canonicalSeasonJournal = getJournalTable(genretvSyncRegistry, "canonical_season");
const canonicalEpisodeJournal = getJournalTable(genretvSyncRegistry, "canonical_episode");
const personalShowJournal = getJournalTable(genretvSyncRegistry, "personal_show");
const personalSeasonJournal = getJournalTable(genretvSyncRegistry, "personal_season");
const personalEpisodeJournal = getJournalTable(genretvSyncRegistry, "personal_episode");
const personalExclusionJournal = getJournalTable(genretvSyncRegistry, "personal_list_exclusion");
const userProfileJournal = getJournalTable(genretvSyncRegistry, "user_profile");
const publishedListJournal = getJournalTable(genretvSyncRegistry, "published_list");
const publishedShowJournal = getJournalTable(genretvSyncRegistry, "published_show");
const publishedSeasonJournal = getJournalTable(genretvSyncRegistry, "published_season");
const publishedEpisodeJournal = getJournalTable(genretvSyncRegistry, "published_episode");
const listImportJournal = getJournalTable(genretvSyncRegistry, "list_import");
const publishApplicationJournal = getJournalTable(genretvSyncRegistry, "publish_application");
const canonicalProposalJournal = getJournalTable(genretvSyncRegistry, "canonical_proposal");
const maintainerNotificationJournal = getJournalTable(genretvSyncRegistry, "maintainer_notification");

const SyncStatusContext = createContext<SyncStatusValue | null>(null);

export function GenretvSyncStatusProvider({
  children,
  monitorMutations,
  runtime,
}: {
  children: ReactNode;
  monitorMutations: boolean;
  runtime: SyncRuntimeStatus;
}) {
  const mutationCounts = useMutationStatusCounts(monitorMutations);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const summary = useMemo(() => summarizeMutationCounts(mutationCounts.rows), [mutationCounts.rows]);
  const value = useMemo(
    () => ({ loading: mutationCounts.loading, online, runtime, summary }),
    [mutationCounts.loading, online, runtime, summary],
  );

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}

export function useAllMutationDetails(ready = true): MutationDetails {
  const canonicalShow = useJournalRows("canonical_show", ready);
  const canonicalSeason = useJournalRows("canonical_season", ready);
  const canonicalEpisode = useJournalRows("canonical_episode", ready);
  const personalShow = useJournalRows("personal_show", ready);
  const personalSeason = useJournalRows("personal_season", ready);
  const personalEpisode = useJournalRows("personal_episode", ready);
  const personalExclusion = useJournalRows("personal_list_exclusion", ready);
  const userProfile = useJournalRows("user_profile", ready);
  const publishedList = useJournalRows("published_list", ready);
  const publishedShow = useJournalRows("published_show", ready);
  const publishedSeason = useJournalRows("published_season", ready);
  const publishedEpisode = useJournalRows("published_episode", ready);
  const listImport = useJournalRows("list_import", ready);
  const publishApplication = useJournalRows("publish_application", ready);
  const canonicalProposal = useJournalRows("canonical_proposal", ready);
  const maintainerNotification = useJournalRows("maintainer_notification", ready);
  const queries = [
    canonicalShow,
    canonicalSeason,
    canonicalEpisode,
    personalShow,
    personalSeason,
    personalEpisode,
    personalExclusion,
    userProfile,
    publishedList,
    publishedShow,
    publishedSeason,
    publishedEpisode,
    listImport,
    publishApplication,
    canonicalProposal,
    maintainerNotification,
  ];
  const mutations = queries
    .flatMap((query) => query.rows)
    .sort((left, right) => compareMicroseconds(right.enqueuedAtUs, left.enqueuedAtUs));

  return { loading: queries.some((query) => query.loading), mutations };
}

export function useMutationDetails(table: GenretvSyncTable, ready = true): MutationDetails {
  const query = useJournalRows(table, ready);
  return { loading: query.loading, mutations: query.rows };
}

export function useGenretvSyncStatus(): SyncStatusValue {
  const value = useContext(SyncStatusContext);
  if (value == null) throw new Error("useGenretvSyncStatus must be used within GenretvSyncStatusProvider");
  return value;
}

function useJournalRows(table: GenretvSyncTable, ready: boolean): { loading: boolean; rows: LocalMutationState[] } {
  const journal = getJournalTable(genretvSyncRegistry, table);
  const query = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          mutationId: journal.mutationId,
          entityKeyJson: journal.entityKeyJson,
          mutationSeq: journal.mutationSeq,
          mutationKind: journal.mutationKind,
          status: journal.status,
          attemptCount: journal.attemptCount,
          lastError: journal.lastError,
          lastHttpStatus: journal.lastHttpStatus,
          conflictReason: journal.conflictReason,
          enqueuedAtUs: journal.enqueuedAtUs,
          nextRetryAtUs: journal.nextRetryAtUs,
        })
        .from(journal),
    [journal],
    { ready },
  );

  return {
    loading: query.loading,
    rows: query.rows.map((row) => ({
      attemptCount: row.attemptCount,
      conflictReason: row.conflictReason,
      enqueuedAtUs: row.enqueuedAtUs,
      entityKey: parseEntityKey(row.entityKeyJson),
      lastError: row.lastError,
      lastHttpStatus: row.lastHttpStatus,
      mutationId: row.mutationId,
      mutationKind: row.mutationKind,
      mutationSeq: row.mutationSeq,
      nextRetryAtUs: row.nextRetryAtUs,
      status: row.status,
      table,
    })),
  };
}

function useMutationStatusCounts(ready: boolean): { loading: boolean; rows: MutationStatusCount[] } {
  const query = useLiveDrizzleRows(
    (sync) =>
      unionAll(
        sync.drizzle
          .select({ status: canonicalShowJournal.status, count: count().as("count") })
          .from(canonicalShowJournal)
          .groupBy(canonicalShowJournal.status),
        sync.drizzle
          .select({ status: canonicalSeasonJournal.status, count: count().as("count") })
          .from(canonicalSeasonJournal)
          .groupBy(canonicalSeasonJournal.status),
        sync.drizzle
          .select({ status: canonicalEpisodeJournal.status, count: count().as("count") })
          .from(canonicalEpisodeJournal)
          .groupBy(canonicalEpisodeJournal.status),
        sync.drizzle
          .select({ status: personalShowJournal.status, count: count().as("count") })
          .from(personalShowJournal)
          .groupBy(personalShowJournal.status),
        sync.drizzle
          .select({ status: personalSeasonJournal.status, count: count().as("count") })
          .from(personalSeasonJournal)
          .groupBy(personalSeasonJournal.status),
        sync.drizzle
          .select({ status: personalEpisodeJournal.status, count: count().as("count") })
          .from(personalEpisodeJournal)
          .groupBy(personalEpisodeJournal.status),
        sync.drizzle
          .select({ status: personalExclusionJournal.status, count: count().as("count") })
          .from(personalExclusionJournal)
          .groupBy(personalExclusionJournal.status),
        sync.drizzle
          .select({ status: userProfileJournal.status, count: count().as("count") })
          .from(userProfileJournal)
          .groupBy(userProfileJournal.status),
        sync.drizzle
          .select({ status: publishedListJournal.status, count: count().as("count") })
          .from(publishedListJournal)
          .groupBy(publishedListJournal.status),
        sync.drizzle
          .select({ status: publishedShowJournal.status, count: count().as("count") })
          .from(publishedShowJournal)
          .groupBy(publishedShowJournal.status),
        sync.drizzle
          .select({ status: publishedSeasonJournal.status, count: count().as("count") })
          .from(publishedSeasonJournal)
          .groupBy(publishedSeasonJournal.status),
        sync.drizzle
          .select({ status: publishedEpisodeJournal.status, count: count().as("count") })
          .from(publishedEpisodeJournal)
          .groupBy(publishedEpisodeJournal.status),
        sync.drizzle
          .select({ status: listImportJournal.status, count: count().as("count") })
          .from(listImportJournal)
          .groupBy(listImportJournal.status),
        sync.drizzle
          .select({ status: publishApplicationJournal.status, count: count().as("count") })
          .from(publishApplicationJournal)
          .groupBy(publishApplicationJournal.status),
        sync.drizzle
          .select({ status: canonicalProposalJournal.status, count: count().as("count") })
          .from(canonicalProposalJournal)
          .groupBy(canonicalProposalJournal.status),
        sync.drizzle
          .select({ status: maintainerNotificationJournal.status, count: count().as("count") })
          .from(maintainerNotificationJournal)
          .groupBy(maintainerNotificationJournal.status),
      ),
    [],
    { ready },
  );

  return { loading: query.loading, rows: query.rows };
}

export function parseEntityKey(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

export function summarizeMutations(mutations: readonly LocalMutationState[]): SyncSummary {
  const summary = {
    acked: 0,
    conflicted: 0,
    failed: 0,
    pending: 0,
    quarantined: 0,
    rejected: 0,
    sending: 0,
    total: 0,
  };
  for (const mutation of mutations) {
    summary.total += 1;
    if (mutation.status in summary) summary[mutation.status as keyof Omit<SyncSummary, "total">] += 1;
  }
  return summary;
}

export function summarizeMutationCounts(counts: readonly MutationStatusCount[]): SyncSummary {
  const summary = emptySyncSummary();
  for (const row of counts) {
    const count = Number(row.count);
    summary.total += count;
    if (row.status in summary) summary[row.status as keyof Omit<SyncSummary, "total">] += count;
  }
  return summary;
}

function emptySyncSummary(): SyncSummary {
  return {
    acked: 0,
    conflicted: 0,
    failed: 0,
    pending: 0,
    quarantined: 0,
    rejected: 0,
    sending: 0,
    total: 0,
  };
}

function compareMicroseconds(left: string, right: string): number {
  const leftValue = BigInt(left);
  const rightValue = BigInt(right);
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

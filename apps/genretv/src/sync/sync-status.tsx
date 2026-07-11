import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
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
  mutations: readonly LocalMutationState[];
  online: boolean;
  runtime: SyncRuntimeStatus;
  summary: SyncSummary;
}

const SyncStatusContext = createContext<SyncStatusValue | null>(null);

export function GenretvSyncStatusProvider({ children, runtime }: { children: ReactNode; runtime: SyncRuntimeStatus }) {
  const canonicalShow = useJournalRows("canonical_show");
  const canonicalSeason = useJournalRows("canonical_season");
  const canonicalEpisode = useJournalRows("canonical_episode");
  const personalShow = useJournalRows("personal_show");
  const personalSeason = useJournalRows("personal_season");
  const personalEpisode = useJournalRows("personal_episode");
  const personalExclusion = useJournalRows("personal_list_exclusion");
  const userProfile = useJournalRows("user_profile");
  const publishedList = useJournalRows("published_list");
  const publishedShow = useJournalRows("published_show");
  const publishedSeason = useJournalRows("published_season");
  const publishedEpisode = useJournalRows("published_episode");
  const listImport = useJournalRows("list_import");
  const publishApplication = useJournalRows("publish_application");
  const canonicalProposal = useJournalRows("canonical_proposal");
  const maintainerNotification = useJournalRows("maintainer_notification");
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

  const mutations = useMemo(
    () =>
      [
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
      ]
        .flat()
        .sort((left, right) => compareMicroseconds(right.enqueuedAtUs, left.enqueuedAtUs)),
    [
      canonicalEpisode,
      canonicalProposal,
      canonicalSeason,
      canonicalShow,
      listImport,
      maintainerNotification,
      personalEpisode,
      personalExclusion,
      personalSeason,
      personalShow,
      publishApplication,
      publishedEpisode,
      publishedList,
      publishedSeason,
      publishedShow,
      userProfile,
    ],
  );
  const summary = useMemo(() => summarizeMutations(mutations), [mutations]);
  const value = useMemo(() => ({ mutations, online, runtime, summary }), [mutations, online, runtime, summary]);

  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>;
}

export function useGenretvSyncStatus(): SyncStatusValue {
  const value = useContext(SyncStatusContext);
  if (value == null) throw new Error("useGenretvSyncStatus must be used within GenretvSyncStatusProvider");
  return value;
}

function useJournalRows(table: GenretvSyncTable): LocalMutationState[] {
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
  );

  return query.rows.map((row) => ({
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
  }));
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

function compareMicroseconds(left: string, right: string): number {
  const leftValue = BigInt(left);
  const rightValue = BigInt(right);
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

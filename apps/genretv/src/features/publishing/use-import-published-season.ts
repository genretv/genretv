import { useSyncClient } from "@genretv/offline-data/hooks";
import { useState } from "react";

import { assertTransactionAcked } from "../../domain/mutation-acks";
import type { PublishedSeasonSummary } from "./imports";

export type ImportMode = "linked" | "detached";

export function useImportPublishedSeason() {
  const client = useSyncClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const importSeason = async (
    season: PublishedSeasonSummary,
    importMode: ImportMode,
    availableSeasons: readonly PublishedSeasonSummary[] = [season],
  ) => {
    const targetShowId = crypto.randomUUID();
    const releases = prerequisiteReleases(season, availableSeasons);
    setSavingKey(`${season.id}:${importMode}`);
    setActionError(null);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (importMode === "linked") {
          for (const release of releases.filter((candidate) => candidate.importMode == null)) {
            tx.tables.list_import.create({
              id: crypto.randomUUID(),
              sourcePublishedListId: release.publishedListId,
              sourcePublishedShowId: release.publishedShowId,
              sourcePublishedSeasonId: release.id,
              sourcePublishedEpisodeId: null,
              targetPersonalShowId: null,
              targetPersonalSeasonId: null,
              targetPersonalEpisodeId: null,
              importMode,
              importedKind: "season",
              notes: null,
            });
          }
          return;
        }

        tx.tables.personal_show.create({
          id: targetShowId,
          canonicalShowId: null,
          displayTitle: season.displayTitle,
          originalTitle: season.originalTitle,
          lifecycleStatus: season.lifecycleStatus,
          endedReason: season.endedReason,
          languages: season.languages,
          countries: season.countries,
          genreTags: season.genreTags,
          externalLinks: season.externalLinks,
          notes: season.showNotes,
        });
        for (const release of releases) {
          const targetSeasonId = crypto.randomUUID();
          tx.tables.personal_season.create({
            id: targetSeasonId,
            personalShowId: targetShowId,
            canonicalShowId: null,
            canonicalSeasonId: null,
            section: scheduleSection(release.section),
            seasonNumber: release.seasonNumber,
            seasonLabel: release.customSeasonLabel,
            title: release.title,
            releaseKind: release.releaseKind,
            isFinal: release.isFinal,
            timing: release.timing,
            releasePattern: release.releasePattern,
            releasePrecision: release.releasePrecision,
            dateConfidence: release.dateConfidence,
            releaseWindow: release.releaseWindow,
            finaleWindow: release.finaleWindow,
            sortKey: release.sortKey,
            episodeCount: release.episodeCount,
            sourceRow: release.sourceRow,
            organizations: release.organizationSeeds,
            externalLinks: release.seasonExternalLinks,
            notes: release.notes,
          });
          for (const episode of release.episodes) {
            const targetEpisodeId = crypto.randomUUID();
            tx.tables.personal_episode.create({
              id: targetEpisodeId,
              canonicalShowId: null,
              canonicalSeasonId: null,
              canonicalEpisodeId: null,
              personalSeasonId: targetSeasonId,
              episodeLabel: episode.episodeLabel,
              title: episode.title,
              releaseWindow: episode.releaseWindow,
              sortKey: episode.sortKey,
              externalLinks: episode.externalLinks,
              notes: episode.notes,
            });
            tx.tables.list_import.create({
              id: crypto.randomUUID(),
              sourcePublishedListId: release.publishedListId,
              sourcePublishedShowId: release.publishedShowId,
              sourcePublishedSeasonId: release.id,
              sourcePublishedEpisodeId: episode.id,
              targetPersonalShowId: targetShowId,
              targetPersonalSeasonId: targetSeasonId,
              targetPersonalEpisodeId: targetEpisodeId,
              importMode,
              importedKind: "episode",
              notes: null,
            });
          }
          tx.tables.list_import.create({
            id: crypto.randomUUID(),
            sourcePublishedListId: release.publishedListId,
            sourcePublishedShowId: release.publishedShowId,
            sourcePublishedSeasonId: release.id,
            sourcePublishedEpisodeId: null,
            targetPersonalShowId: targetShowId,
            targetPersonalSeasonId: targetSeasonId,
            targetPersonalEpisodeId: null,
            importMode,
            importedKind: "season",
            notes: null,
          });
        }
      });
      assertTransactionAcked(result, "Importing published season");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingKey(null);
    }
  };

  const removeLinkedImport = async (season: PublishedSeasonSummary) => {
    const importId = season.importId;
    if (importId == null || season.importMode !== "linked") return;
    setSavingKey(`${season.id}:remove-linked`);
    setActionError(null);
    try {
      const result = await client.transaction({ mode: "pessimistic" }, (tx) => {
        tx.tables.list_import.delete({ id: importId });
      });
      assertTransactionAcked(result, "Removing linked import");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingKey(null);
    }
  };

  return { actionError, importSeason, removeLinkedImport, savingKey };
}

export function prerequisiteReleases(
  selected: PublishedSeasonSummary,
  available: readonly PublishedSeasonSummary[],
): PublishedSeasonSummary[] {
  if (selected.releaseKind !== "season" || selected.seasonNumber == null) return [selected];
  return available
    .filter(
      (release) =>
        release.publishedShowId === selected.publishedShowId &&
        release.releaseKind === "season" &&
        release.seasonNumber != null &&
        release.seasonNumber <= selected.seasonNumber!,
    )
    .sort((left, right) => left.seasonNumber! - right.seasonNumber!);
}

function scheduleSection(value: string): "current" | "upcoming" | "past" {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

import { useSyncClient } from "@genretv/offline-data/hooks";
import { useState } from "react";

import type { PublishedSeasonSummary } from "./imports";

export type ImportMode = "linked" | "detached";

export function useImportPublishedSeason() {
  const client = useSyncClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const importSeason = async (season: PublishedSeasonSummary, importMode: ImportMode) => {
    const targetShowId = crypto.randomUUID();
    const targetSeasonId = crypto.randomUUID();
    setSavingKey(`${season.id}:${importMode}`);
    setActionError(null);
    try {
      await client.transaction({ mode: "pessimistic" }, (tx) => {
        if (importMode === "linked") {
          tx.tables.list_import.create({
            id: crypto.randomUUID(),
            sourcePublishedListId: season.publishedListId,
            sourcePublishedShowId: season.publishedShowId,
            sourcePublishedSeasonId: season.id,
            sourcePublishedEpisodeId: null,
            targetPersonalShowId: null,
            targetPersonalSeasonId: null,
            targetPersonalEpisodeId: null,
            importMode,
            importedKind: "season",
            notes: null,
          });
          return;
        }

        tx.tables.personal_show.create({
          id: targetShowId,
          canonicalShowId: null,
          displayTitle: season.displayTitle,
          originalTitle: season.originalTitle,
          languages: season.languages,
          countries: season.countries,
          genreTags: season.genreTags,
          externalLinks: season.externalLinks,
          notes: season.showNotes,
        });
        tx.tables.personal_season.create({
          id: targetSeasonId,
          personalShowId: targetShowId,
          canonicalShowId: null,
          canonicalSeasonId: null,
          section: scheduleSection(season.section),
          seasonLabel: season.seasonLabel,
          timing: season.timing,
          endedReason: season.endedReason,
          releasePattern: season.releasePattern,
          releasePrecision: season.releasePrecision,
          dateConfidence: season.dateConfidence,
          releaseWindow: season.releaseWindow,
          finaleWindow: season.finaleWindow,
          sortKey: season.sortKey,
          episodeCount: season.episodeCount,
          sourceRow: season.sourceRow,
          organizations: season.organizationSeeds,
          externalLinks: season.seasonExternalLinks,
          notes: season.notes,
        });
        for (const episode of season.episodes) {
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
            sourcePublishedListId: season.publishedListId,
            sourcePublishedShowId: season.publishedShowId,
            sourcePublishedSeasonId: season.id,
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
          sourcePublishedListId: season.publishedListId,
          sourcePublishedShowId: season.publishedShowId,
          sourcePublishedSeasonId: season.id,
          sourcePublishedEpisodeId: null,
          targetPersonalShowId: targetShowId,
          targetPersonalSeasonId: targetSeasonId,
          targetPersonalEpisodeId: null,
          importMode,
          importedKind: "season",
          notes: null,
        });
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSavingKey(null);
    }
  };

  return { actionError, importSeason, savingKey };
}

function scheduleSection(value: string): "current" | "upcoming" | "past" {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

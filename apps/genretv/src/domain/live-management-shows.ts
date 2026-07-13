import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { useMemo } from "react";

import { useAuth } from "../auth/auth";
import { useCanonicalSchedule } from "./live-canonical-schedule";
import { liveAggregateState } from "./live-query-readiness";
import { buildManagementShows, type CanonicalSchedule, type ManagementShow } from "./schedule";

const personalShow = genretvSyncRegistry.personal_show.view!;

export interface LiveManagementShows {
  error: Error | null;
  loading: boolean;
  schedule: CanonicalSchedule;
  shows: ManagementShow[];
}

export function useManagementShows(): LiveManagementShows {
  const { session } = useAuth();
  const personalReady = session != null;
  const canonical = useCanonicalSchedule();
  const personalShows = useLiveDrizzleRows(
    (client) =>
      client.drizzle
        .select({
          id: personalShow.id,
          canonicalShowId: personalShow.canonicalShowId,
          displayTitle: personalShow.displayTitle,
          originalTitle: personalShow.originalTitle,
          lifecycleStatus: personalShow.lifecycleStatus,
          endedReason: personalShow.endedReason,
          languages: personalShow.languages,
          countries: personalShow.countries,
          genreTags: personalShow.genreTags,
          externalLinks: personalShow.externalLinks,
          notes: personalShow.notes,
        })
        .from(personalShow),
    [],
    { ready: personalReady },
  );
  const shows = useMemo(
    () =>
      applyPersonalShowsForManagement(
        buildManagementShows(canonical.schedule.allEntries),
        personalReady ? personalShows.rows : [],
      ),
    [canonical.schedule.allEntries, personalReady, personalShows.rows],
  );
  const personalState = liveAggregateState([personalShows], shows.length > 0);

  return {
    error: canonical.error ?? (personalReady ? personalShows.error : null),
    loading: canonical.loading || (personalReady && personalState.loading),
    schedule: canonical.schedule,
    shows,
  };
}

function applyPersonalShowsForManagement(
  existingShows: ManagementShow[],
  personalRows: ReadonlyArray<{
    canonicalShowId: string | null;
    countries: unknown;
    displayTitle: string;
    externalLinks: unknown;
    genreTags: unknown;
    id: string;
    languages: unknown;
    lifecycleStatus: string;
    endedReason: string | null;
    notes: string | null;
    originalTitle: string | null;
  }>,
): ManagementShow[] {
  const overlays = new Map(
    personalRows.flatMap((row) => (row.canonicalShowId == null ? [] : [[row.canonicalShowId, row]])),
  );
  const overlaidShows = existingShows.map((show) => {
    const overlay = overlays.get(show.id);
    if (overlay == null) return show;
    return {
      ...show,
      title: overlay.displayTitle,
      originalTitle: overlay.originalTitle,
      lifecycleStatus: lifecycleStatus(overlay.lifecycleStatus),
      endedReason: overlay.endedReason,
      languages: stringArray(overlay.languages),
      countries: stringArray(overlay.countries),
      genres: stringArray(overlay.genreTags),
      links: externalLinks(overlay.externalLinks),
      notes: overlay.notes,
    };
  });
  const seen = new Set(overlaidShows.map((show) => show.id));
  const additions = personalRows.flatMap((row): ManagementShow[] => {
    if (row.canonicalShowId != null || seen.has(row.id)) return [];
    return [
      {
        id: row.id,
        title: row.displayTitle,
        originalTitle: row.originalTitle,
        lifecycleStatus: lifecycleStatus(row.lifecycleStatus),
        endedReason: row.endedReason,
        languages: stringArray(row.languages),
        organizations: [],
        genres: stringArray(row.genreTags),
        links: externalLinks(row.externalLinks),
        countries: stringArray(row.countries),
        notes: row.notes,
        listedSeasonCount: 0,
        knownSeasonCount: 0,
        seasons: [],
      },
    ];
  });
  return [...overlaidShows, ...additions].sort((left, right) => left.title.localeCompare(right.title));
}

function lifecycleStatus(value: string): ManagementShow["lifecycleStatus"] {
  return value === "ended" || value === "cancelled" ? value : "open";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function externalLinks(value: unknown): ManagementShow["links"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ManagementShow["links"] => {
    if (!isRecord(item) || typeof item["url"] !== "string" || typeof item["label"] !== "string") return [];
    return [
      {
        label: item["label"],
        url: item["url"],
        ...(typeof item["kind"] === "string" ? { kind: item["kind"] } : {}),
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

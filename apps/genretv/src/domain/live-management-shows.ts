import { useMemo } from "react";

import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows } from "@genretv/offline-data/hooks";
import { useAuth } from "../auth/auth";

import { useCanonicalSchedule } from "./live-canonical-schedule";
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
      includeEmptyPersonalShows(
        buildManagementShows(canonical.schedule.entries),
        personalReady ? personalShows.rows : [],
      ),
    [canonical.schedule.entries, personalReady, personalShows.rows],
  );

  return {
    error: canonical.error ?? (personalReady ? personalShows.error : null),
    loading: canonical.loading || (personalReady && personalShows.loading),
    schedule: canonical.schedule,
    shows,
  };
}

function includeEmptyPersonalShows(
  existingShows: ManagementShow[],
  personalRows: ReadonlyArray<{
    canonicalShowId: string | null;
    countries: unknown;
    displayTitle: string;
    externalLinks: unknown;
    genreTags: unknown;
    id: string;
    languages: unknown;
    notes: string | null;
    originalTitle: string | null;
  }>,
): ManagementShow[] {
  const seen = new Set(existingShows.map((show) => show.id));
  const additions = personalRows.flatMap((row): ManagementShow[] => {
    if (row.canonicalShowId != null || seen.has(row.id)) return [];
    return [
      {
        id: row.id,
        title: row.displayTitle,
        originalTitle: row.originalTitle,
        languages: stringArray(row.languages),
        organizations: [],
        genres: stringArray(row.genreTags),
        links: externalLinks(row.externalLinks),
        countries: stringArray(row.countries),
        notes: row.notes,
        seasons: [],
      },
    ];
  });
  return [...existingShows, ...additions].sort((left, right) => left.title.localeCompare(right.title));
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

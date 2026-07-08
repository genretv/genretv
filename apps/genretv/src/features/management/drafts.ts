import { useEffect, useMemo, useState } from "react";

import type { ManagementSeason, ManagementShow, ScheduleEpisode, ScheduleSection } from "../../domain/schedule";

export interface ManagementShowDraft {
  title: string;
  originalTitle: string;
  languagesText: string;
  countriesText: string;
  genresText: string;
  linksText: string;
  notes: string;
}

export interface ManagementSeasonDraft {
  section: ScheduleSection;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  releasePattern: string;
  episodeCount: string;
  organizationsText: string;
  linksText: string;
  notes: string;
}

export interface ManagementEpisodeDraft {
  episodeLabel: string;
  title: string;
  releaseDate: string;
  sortKey: string;
  linksText: string;
  notes: string;
}

export function showDraftFromShow(show: ManagementShow): ManagementShowDraft {
  return {
    title: show.title,
    originalTitle: show.originalTitle ?? "",
    languagesText: orderedListToText(show.languages),
    countriesText: orderedListToText(show.countries),
    genresText: orderedListToText(show.genres),
    linksText: externalLinksToText(show.links),
    notes: show.notes ?? "",
  };
}

export function seasonDraftFromSeason(season: ManagementSeason): ManagementSeasonDraft {
  return {
    section: season.section,
    seasonLabel: season.seasonLabel,
    timing: season.timing,
    endedReason: season.endedReason,
    releasePattern: season.releasePattern ?? "",
    episodeCount: season.episodeCount == null ? "" : String(season.episodeCount),
    organizationsText: orderedListToText(season.organizations),
    linksText: externalLinksToText(season.links),
    notes: season.notes ?? "",
  };
}

export function episodeDraftFromEpisode(episode: ScheduleEpisode): ManagementEpisodeDraft {
  return {
    episodeLabel: episode.episodeLabel,
    title: episode.title,
    releaseDate: episode.releaseDate,
    sortKey: "",
    linksText: externalLinksToText(episode.links),
    notes: episode.notes ?? "",
  };
}

export function emptyEpisodeDraft(): ManagementEpisodeDraft {
  return {
    episodeLabel: "",
    title: "",
    releaseDate: "",
    sortKey: "",
    linksText: "",
    notes: "",
  };
}

export function orderedListToText(values: readonly string[]): string {
  return values.join("\n");
}

export function orderedTextToList(value: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const raw of value.split(/\r?\n|,/)) {
    const item = raw.trim();
    if (item === "" || seen.has(item)) continue;
    seen.add(item);
    values.push(item);
  }
  return values;
}

export function organizationRowsToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const names = value.flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    if (isRecord(item) && typeof item["name"] === "string") return [item["name"]];
    return [];
  });
  return orderedListToText(names);
}

export function organizationTextToRows(
  value: string,
): Array<{ externalLinks: unknown[]; name: string; role: "unknown" }> {
  return orderedTextToList(value).map((name) => ({ name, role: "unknown", externalLinks: [] }));
}

export function externalLinksToText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((item): string[] => {
      if (!isRecord(item) || typeof item["url"] !== "string" || typeof item["label"] !== "string") return [];
      return [
        typeof item["kind"] === "string"
          ? `${item["kind"]} | ${item["label"]} | ${item["url"]}`
          : `${item["label"]} | ${item["url"]}`,
      ];
    })
    .join("\n");
}

export function externalLinkTextToRows(value: string): Array<{ kind?: string; label: string; url: string }> {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .flatMap((line): Array<{ kind?: string; label: string; url: string }> => {
      const parts = line
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      const first = parts[0];
      const second = parts[1];
      if (first == null) return [];
      if (second != null && parts.length >= 3) return [{ kind: first, label: second, url: parts.slice(2).join(" | ") }];
      if (second != null) return [{ label: first, url: second }];
      return [{ label: first, url: first }];
    });
}

export function parseEpisodeCountDraft(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function showDraftStorageKey(showId: string): string {
  return `genretv.management.showDraft.${showId}`;
}

export function seasonDraftStorageKey(seasonId: string): string {
  return `genretv.management.seasonDraft.${seasonId}`;
}

export function episodeDraftStorageKey(seasonId: string, episodeId: string): string {
  return `genretv.management.episodeDraft.${seasonId}.${episodeId}`;
}

export function releaseDateDraftToWindow(value: string): { raw: string; precision: string; confidence: string } | null {
  const raw = value.trim();
  return raw === "" ? null : { raw, precision: "unknown", confidence: "unknown" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

export function useManagementDraft<T>(storageKey: string, initialDraft: T) {
  const [draft, setDraft] = useState<T>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved == null) {
      setDraft(initialDraft);
      setSavedAt(null);
      return;
    }
    try {
      setDraft(JSON.parse(saved) as T);
      setSavedAt(saved);
    } catch {
      setDraft(initialDraft);
      setSavedAt(null);
    }
  }, [initialDraft, storageKey]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialDraft), [draft, initialDraft]);
  const locallySaved = savedAt === JSON.stringify(draft);

  const saveLocalDraft = () => {
    const serialized = JSON.stringify(draft);
    window.localStorage.setItem(storageKey, serialized);
    setSavedAt(serialized);
  };

  const discardLocalDraft = () => {
    window.localStorage.removeItem(storageKey);
    setDraft(initialDraft);
    setSavedAt(null);
  };

  return {
    draft,
    dirty,
    locallySaved,
    setDraft,
    saveLocalDraft,
    discardLocalDraft,
  };
}

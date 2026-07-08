import { useEffect, useMemo, useState } from "react";

import type { ManagementSeason, ManagementShow, ScheduleEpisode, ScheduleSection } from "../../domain/schedule";

export interface ManagementShowDraft {
  title: string;
  originalTitle: string;
  languagesText: string;
  countriesText: string;
  genresText: string;
  notes: string;
}

export interface ManagementSeasonDraft {
  section: ScheduleSection;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  releasePattern: string;
  episodeCount: string;
  notes: string;
}

export interface ManagementEpisodeDraft {
  episodeLabel: string;
  title: string;
  releaseDate: string;
  sortKey: string;
  notes: string;
}

export function showDraftFromShow(show: ManagementShow): ManagementShowDraft {
  return {
    title: show.title,
    originalTitle: show.originalTitle ?? "",
    languagesText: orderedListToText(show.languages),
    countriesText: orderedListToText(show.countries),
    genresText: orderedListToText(show.genres),
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
    notes: season.notes ?? "",
  };
}

export function episodeDraftFromEpisode(episode: ScheduleEpisode): ManagementEpisodeDraft {
  return {
    episodeLabel: episode.episodeLabel,
    title: episode.title,
    releaseDate: episode.releaseDate,
    sortKey: "",
    notes: episode.notes ?? "",
  };
}

export function emptyEpisodeDraft(): ManagementEpisodeDraft {
  return {
    episodeLabel: "",
    title: "",
    releaseDate: "",
    sortKey: "",
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

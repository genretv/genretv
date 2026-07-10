import { useEffect, useMemo, useRef, useState } from "react";

import type { ManagementSeason, ManagementShow, ScheduleEpisode, SourceScheduleSection } from "../../domain/schedule";

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
  section: SourceScheduleSection;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  releasePattern: string;
  releaseWindowText: string;
  finaleWindowText: string;
  releasePrecision: string;
  dateConfidence: string;
  sortKey: string;
  episodeCount: string;
  organizationsText: string;
  linksText: string;
  notes: string;
}

export interface ManagementEpisodeDraft {
  episodeLabel: string;
  title: string;
  releaseDate: string;
  releasePrecision: string;
  dateConfidence: string;
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
    releaseWindowText: releaseWindowText(season.releaseWindow),
    finaleWindowText: releaseWindowText(season.finaleWindow),
    releasePrecision: season.releasePrecision,
    dateConfidence: season.dateConfidence,
    sortKey: season.sortKey ?? "",
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
    releaseDate: releaseWindowText(episode.releaseWindow),
    releasePrecision: releaseWindowPrecision(episode.releaseWindow),
    dateConfidence: releaseWindowConfidence(episode.releaseWindow),
    sortKey: episode.sortKey ?? "",
    linksText: externalLinksToText(episode.links),
    notes: episode.notes ?? "",
  };
}

export function emptyEpisodeDraft(): ManagementEpisodeDraft {
  return {
    episodeLabel: "",
    title: "",
    releaseDate: "",
    releasePrecision: "unknown",
    dateConfidence: "unknown",
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
  return releaseWindowDraftToWindow(value, "unknown", "unknown");
}

export function releaseWindowDraftToWindow(
  value: string,
  precision: string,
  confidence: string,
): { raw: string; precision: string; confidence: string } | null {
  const raw = value.trim();
  return raw === ""
    ? null
    : {
        raw,
        precision: precision.trim() || "unknown",
        confidence: confidence.trim() || "unknown",
      };
}

export function releaseWindowText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value["raw"] === "string") return value["raw"];
  return "";
}

export function releaseWindowPrecision(value: unknown): string {
  if (isRecord(value) && typeof value["precision"] === "string" && value["precision"].trim() !== "") {
    return value["precision"];
  }
  return "unknown";
}

export function releaseWindowConfidence(value: unknown): string {
  if (isRecord(value) && typeof value["confidence"] === "string" && value["confidence"].trim() !== "") {
    return value["confidence"];
  }
  return "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

export function useManagementDraft<T>(storageKey: string, initialDraft: T) {
  const [draft, setDraft] = useState<T>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const storageKeyRef = useRef(storageKey);
  const initialDraftSerializedRef = useRef(JSON.stringify(initialDraft));

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const currentDraftSerialized = JSON.stringify(draftRef.current);
    const storageKeyChanged = storageKeyRef.current !== storageKey;
    const dirtyAgainstPreviousInitial = currentDraftSerialized !== initialDraftSerializedRef.current;
    const initialDraftSerialized = JSON.stringify(initialDraft);

    storageKeyRef.current = storageKey;
    initialDraftSerializedRef.current = initialDraftSerialized;

    if (!storageKeyChanged && dirtyAgainstPreviousInitial) return;

    const saved = window.localStorage.getItem(storageKey);
    if (saved == null) {
      if (currentDraftSerialized !== initialDraftSerialized) setDraft(initialDraft);
      setSavedAt(null);
      return;
    }
    try {
      if (currentDraftSerialized !== saved) setDraft(JSON.parse(saved) as T);
      setSavedAt(saved);
    } catch {
      if (currentDraftSerialized !== initialDraftSerialized) setDraft(initialDraft);
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

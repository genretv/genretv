import { createHash } from "node:crypto";

type ScheduleSection = "current" | "upcoming" | "past";

interface ExternalLinkSeed {
  kind?: string;
  label: string;
  url: string;
}

interface ReleaseWindowSeed {
  raw: string;
  precision: string;
  confidence: string;
  year: number | null;
  month: number | null;
  day: number | null;
  releaseSeason: string | null;
}

interface BlogspotSeedEntry {
  id: string;
  section: ScheduleSection;
  sourceRow: number;
  show: {
    displayTitle: string;
    originalTitle?: string | null;
    externalLinks: ExternalLinkSeed[];
    languages: string[];
    countries?: string[];
  };
  season: {
    rawSeason: string;
    tentative: boolean;
    extraMovie: boolean;
    releasePattern: string | null;
    releaseWindow: ReleaseWindowSeed | null;
    finaleWindow: ReleaseWindowSeed | null;
    lifecycleMarkers: Array<string | { meaning?: string }>;
    legacyStatus: string;
    legacyTiming: string;
  };
  organizations: Array<{ name: string; role: string; externalLinks: ExternalLinkSeed[] }>;
  genreTags: string[];
  notes: string[];
  legacy: {
    detailText: string;
  };
}

export interface BlogspotCanonicalSeed {
  entries: BlogspotSeedEntry[];
}

export interface CanonicalShowSeedRow {
  id: string;
  displayTitle: string;
  originalTitle: string | null;
  languages: string[];
  countries: string[];
  genreTags: string[];
  externalLinks: ExternalLinkSeed[];
  notes: string | null;
}

export interface CanonicalSeasonSeedRow {
  id: string;
  showId: string;
  section: ScheduleSection;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  releasePattern: string | null;
  releasePrecision: string;
  dateConfidence: string;
  releaseWindow: ReleaseWindowSeed | null;
  finaleWindow: ReleaseWindowSeed | null;
  sortKey: string | null;
  episodeCount: number | null;
  sourceRow: number;
  organizations: Array<{ name: string; role: string; externalLinks: ExternalLinkSeed[] }>;
  externalLinks: ExternalLinkSeed[];
  notes: string | null;
}

export interface CanonicalEpisodeSeedRow {
  id: string;
  seasonId: string;
  episodeLabel: string | null;
  title: string | null;
  releaseWindow: ReleaseWindowSeed | null;
  sortKey: string | null;
  externalLinks: ExternalLinkSeed[];
  notes: string | null;
}

export interface CanonicalRegistrySeedRows {
  shows: CanonicalShowSeedRow[];
  seasons: CanonicalSeasonSeedRow[];
  episodes: CanonicalEpisodeSeedRow[];
}

const defaultLanguage = "en";
const lifecycleLabels: Record<string, string> = {
  cancelled: "Canceled",
  final_season: "Final season",
  renewed_for_final_season: "Renewed for final season",
  renewed: "Renewed",
  moving_to_new_channel: "Moved",
};
const releaseSeasonMidpoints: Record<string, { month: number; day: number }> = {
  winter: { month: 2, day: 15 },
  spring: { month: 4, day: 15 },
  summer: { month: 7, day: 15 },
  autumn: { month: 10, day: 15 },
};

export function buildCanonicalRegistrySeedRows(seed: BlogspotCanonicalSeed): CanonicalRegistrySeedRows {
  const shows = new Map<string, CanonicalShowSeedRow>();
  const seasons: CanonicalSeasonSeedRow[] = [];

  for (const entry of seed.entries) {
    const showId = stableUuid(`show:${normalizeTitle(entry.show.displayTitle)}`);
    const existing = shows.get(showId);
    const show =
      existing ??
      ({
        id: showId,
        displayTitle: entry.show.displayTitle,
        originalTitle: entry.show.originalTitle ?? null,
        languages: [],
        countries: [],
        genreTags: [],
        externalLinks: [],
        notes: null,
      } satisfies CanonicalShowSeedRow);

    show.languages = appendUnique(show.languages, normalizeLanguages(entry.show.languages));
    show.countries = appendUnique(show.countries, entry.show.countries ?? []);
    show.genreTags = appendUnique(show.genreTags, entry.genreTags);
    show.externalLinks = mergeLinks(show.externalLinks, entry.show.externalLinks);
    show.notes = joinNotes([show.notes, ...entry.notes]);
    shows.set(showId, show);

    const releaseWindow = entry.season.releaseWindow;
    const finaleWindow = entry.season.finaleWindow;
    seasons.push({
      id: stableUuid(`season:${entry.id}`),
      showId,
      section: entry.section,
      seasonLabel: seasonLabel(entry),
      timing: timingFor(entry),
      endedReason: endedReasonFor(entry),
      releasePattern: entry.season.releasePattern,
      releasePrecision: releaseWindow?.precision ?? "unknown",
      dateConfidence: releaseWindow?.confidence ?? "unknown",
      releaseWindow,
      finaleWindow,
      sortKey: sortKeyFor(releaseWindow ?? finaleWindow),
      episodeCount: null,
      sourceRow: entry.sourceRow,
      organizations: entry.organizations,
      externalLinks: [],
      notes: joinNotes(entry.notes),
    });
  }

  return {
    shows: [...shows.values()].sort((left, right) => left.displayTitle.localeCompare(right.displayTitle)),
    seasons: seasons.sort((left, right) => left.sourceRow - right.sourceRow),
    episodes: [],
  };
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizeLanguages(languages: readonly string[]): string[] {
  return languages.length === 0 ? [defaultLanguage] : [...languages];
}

function appendUnique(left: readonly string[], right: readonly string[]): string[] {
  const values = [...left];
  for (const value of right) {
    if (value !== "" && !values.includes(value)) values.push(value);
  }
  return values;
}

function mergeLinks(left: readonly ExternalLinkSeed[], right: readonly ExternalLinkSeed[]): ExternalLinkSeed[] {
  const links = new Map<string, ExternalLinkSeed>();
  for (const link of [...left, ...right]) {
    links.set(link.url, link);
  }
  return [...links.values()];
}

function joinNotes(notes: readonly (string | null)[]): string | null {
  const text = notes.filter((note): note is string => typeof note === "string" && note.trim() !== "").join("\n\n");
  return text === "" ? null : text;
}

function seasonLabel(entry: BlogspotSeedEntry): string {
  const prefix = entry.season.extraMovie ? "Movie" : `S${entry.season.rawSeason || "?"}`;
  return entry.season.tentative ? `${prefix}?` : prefix;
}

function timingFor(entry: BlogspotSeedEntry): string {
  const release = entry.season.releaseWindow?.raw ?? "";
  const finale = entry.season.finaleWindow?.raw ?? "";
  if (entry.section === "current") {
    return [entry.season.legacyTiming, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  }
  if (entry.section === "upcoming") {
    return [release || entry.season.legacyTiming, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  }
  return entry.legacy.detailText || entry.season.legacyStatus || "past";
}

function endedReasonFor(entry: BlogspotSeedEntry): string {
  if (entry.season.legacyStatus !== "") return entry.season.legacyStatus;
  const markers = entry.season.lifecycleMarkers
    .map((marker) => (typeof marker === "string" ? marker : marker.meaning))
    .map((marker) => (marker != null ? (lifecycleLabels[marker] ?? marker) : ""))
    .filter((marker) => marker !== "");
  return markers.length > 0 ? markers.join(", ") : "Unknown";
}

function sortKeyFor(window: ReleaseWindowSeed | null): string | null {
  if (window?.year == null) return null;
  if (window.month != null && window.day != null) return dateKey(window.year, window.month, window.day);
  if (window.month != null) return dateKey(window.year, window.month, 15);
  if (window.releaseSeason != null) {
    const midpoint = releaseSeasonMidpoints[window.releaseSeason];
    if (midpoint != null) return dateKey(window.year, midpoint.month, midpoint.day);
  }
  return dateKey(window.year, 7, 2);
}

function dateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function stableUuid(value: string): string {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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

export interface CanonicalSeedQualityIssue {
  code: string;
  message: string;
  refs: string[];
}

export interface CanonicalSeedQualityReport {
  errors: CanonicalSeedQualityIssue[];
  warnings: CanonicalSeedQualityIssue[];
  stats: {
    duplicateDisplayTitleCount: number;
    inferredSeasonGapCount: number;
    missingCountryCount: number;
    shows: number;
    seasons: number;
    episodes: number;
  };
}

const defaultLanguage = "en";
const countryAliases = new Map([
  ["UK", "GB"],
  ["UNITED KINGDOM", "GB"],
  ["USA", "US"],
  ["UNITED STATES", "US"],
  ["KOREA", "KR"],
  ["SOUTH KOREA", "KR"],
]);
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
  const titleIdentities = titleExternalIdentities(seed.entries);

  for (const entry of seed.entries) {
    const showId = stableUuid(showIdentityKey(entry, titleIdentities));
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
    show.countries = appendUnique(show.countries, normalizeCountries(entry.show.countries ?? []));
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

export function analyzeCanonicalRegistrySeedRows(rows: CanonicalRegistrySeedRows): CanonicalSeedQualityReport {
  const errors: CanonicalSeedQualityIssue[] = [];
  const warnings: CanonicalSeedQualityIssue[] = [];
  const showsById = new Map(rows.shows.map((show) => [show.id, show]));
  const seasonsById = new Map(rows.seasons.map((season) => [season.id, season]));

  duplicateGroups(rows.shows, (show) => show.id).forEach(([id, shows]) => {
    errors.push({
      code: "duplicate-show-id",
      message: `Duplicate canonical show id ${id}`,
      refs: shows.map((show) => show.displayTitle),
    });
  });
  duplicateGroups(rows.seasons, (season) => season.id).forEach(([id, seasons]) => {
    errors.push({
      code: "duplicate-season-id",
      message: `Duplicate canonical season id ${id}`,
      refs: seasons.map((season) => `${season.showId}:${season.seasonLabel}`),
    });
  });
  duplicateGroups(rows.episodes, (episode) => episode.id).forEach(([id, episodes]) => {
    errors.push({
      code: "duplicate-episode-id",
      message: `Duplicate canonical episode id ${id}`,
      refs: episodes.map((episode) => `${episode.seasonId}:${episode.episodeLabel ?? "unknown"}`),
    });
  });

  for (const season of rows.seasons) {
    if (!showsById.has(season.showId)) {
      errors.push({
        code: "missing-season-show",
        message: `Season ${season.id} references missing show ${season.showId}`,
        refs: [season.id],
      });
    }
  }
  for (const episode of rows.episodes) {
    if (!seasonsById.has(episode.seasonId)) {
      errors.push({
        code: "missing-episode-season",
        message: `Episode ${episode.id} references missing season ${episode.seasonId}`,
        refs: [episode.id],
      });
    }
  }

  duplicateGroups(rows.seasons, (season) => `${season.showId}:${normalizeSeasonLabel(season.seasonLabel)}`).forEach(
    ([key, seasons]) => {
      const ordinal = seasonOrdinal(seasons[0]?.seasonLabel ?? "");
      const show = showsById.get(seasons[0]?.showId ?? "");
      const issue = {
        code: ordinal == null ? "duplicate-nonordinal-season-label" : "duplicate-season-label",
        message: `${show?.displayTitle ?? key} has ${seasons.length} rows labelled ${seasons[0]?.seasonLabel ?? key}`,
        refs: seasons.map((season) => `${season.id}:row-${season.sourceRow}`),
      };
      if (ordinal == null) warnings.push(issue);
      else errors.push(issue);
    },
  );

  duplicateGroups(rows.shows, (show) => normalizeTitle(show.displayTitle)).forEach(([title, shows]) => {
    warnings.push({
      code: "duplicate-display-title",
      message: `${shows.length} canonical shows share display title ${title}`,
      refs: shows.map((show) => show.id),
    });
  });

  const showsWithoutCountries = rows.shows.filter((show) => show.countries.length === 0);
  if (showsWithoutCountries.length > 0) {
    warnings.push({
      code: "missing-countries",
      message: `${showsWithoutCountries.length} shows have no country metadata yet`,
      refs: showsWithoutCountries.slice(0, 20).map((show) => show.id),
    });
  }

  const inferredSeasonGaps = inferredSeasonGapWarnings(rows.seasons, showsById);
  warnings.push(...inferredSeasonGaps);

  return {
    errors,
    warnings,
    stats: {
      duplicateDisplayTitleCount: warnings.filter((issue) => issue.code === "duplicate-display-title").length,
      inferredSeasonGapCount: inferredSeasonGaps.length,
      missingCountryCount: showsWithoutCountries.length,
      shows: rows.shows.length,
      seasons: rows.seasons.length,
      episodes: rows.episodes.length,
    },
  };
}

function titleExternalIdentities(entries: readonly BlogspotSeedEntry[]): Map<string, Set<string>> {
  const identities = new Map<string, Set<string>>();
  for (const entry of entries) {
    const externalId = primaryExternalIdentity(entry.show.externalLinks);
    if (externalId == null) continue;
    const title = normalizeTitle(entry.show.displayTitle);
    identities.set(title, new Set([...(identities.get(title) ?? []), externalId]));
  }
  return identities;
}

function showIdentityKey(entry: BlogspotSeedEntry, titleIdentities: ReadonlyMap<string, ReadonlySet<string>>): string {
  const externalId = primaryExternalIdentity(entry.show.externalLinks);
  const title = normalizeTitle(entry.show.displayTitle);
  const identities = titleIdentities.get(title);
  if (externalId != null) return `show:${title}:${externalId}`;
  if (identities?.size === 1) return `show:${title}:${[...identities][0]}`;
  return identities == null ? `show:title:${title}` : `show:${title}:unlinked`;
}

function primaryExternalIdentity(links: readonly ExternalLinkSeed[]): string | null {
  for (const link of links) {
    const imdb = /imdb\.com\/title\/(tt\d+)/i.exec(link.url);
    if (imdb?.[1] != null) return `imdb:${imdb[1].toLocaleLowerCase()}`;
  }
  return null;
}

function normalizeTitle(title: string): string {
  return title.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function normalizeLanguages(languages: readonly string[]): string[] {
  const normalized = languages.flatMap((language) => {
    const value = language.trim().toLocaleLowerCase();
    return /^[a-z]{2,3}$/.test(value) ? [value] : [];
  });
  return normalized.length === 0 ? [defaultLanguage] : appendUnique([], normalized);
}

function normalizeCountries(countries: readonly string[]): string[] {
  return appendUnique(
    [],
    countries.flatMap((country) => {
      const trimmed = country.trim();
      if (trimmed === "") return [];
      const aliased = countryAliases.get(trimmed.toLocaleUpperCase()) ?? trimmed;
      const normalized = aliased.toLocaleUpperCase();
      return /^[A-Z]{2}$/.test(normalized) ? [normalized] : [];
    }),
  );
}

function appendUnique(left: readonly string[], right: readonly string[]): string[] {
  const values = [...left];
  for (const value of right) {
    if (value !== "" && !values.includes(value)) values.push(value);
  }
  return values;
}

function duplicateGroups<T>(values: readonly T[], keyFor: (value: T) => string): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
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
  const extraOrdinal = entry.season.extraMovie ? seasonOrdinalFromRaw(entry.season.rawSeason) : null;
  const prefix = entry.season.extraMovie
    ? extraOrdinal == null
      ? "Special"
      : `S${extraOrdinal} + special`
    : `S${entry.season.rawSeason || "?"}`;
  return entry.season.tentative ? `${prefix}?` : prefix;
}

function normalizeSeasonLabel(label: string): string {
  return label.trim().toLocaleLowerCase().replace(/\s+/g, "");
}

function seasonOrdinalFromRaw(value: string): number | null {
  const match = /^(\d+)/.exec(value.trim());
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

function seasonOrdinal(label: string): number | null {
  const match = /^(?:s|season|series)\s*(\d+)(?:\s*\+\s*(?:special|movie))?\??$/i.exec(label.trim());
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

function inferredSeasonGapWarnings(
  seasons: readonly CanonicalSeasonSeedRow[],
  showsById: ReadonlyMap<string, CanonicalShowSeedRow>,
): CanonicalSeedQualityIssue[] {
  const byShow = new Map<string, CanonicalSeasonSeedRow[]>();
  for (const season of seasons) {
    byShow.set(season.showId, [...(byShow.get(season.showId) ?? []), season]);
  }
  const warnings: CanonicalSeedQualityIssue[] = [];
  for (const [showId, showSeasons] of byShow) {
    const maxOrdinal = showSeasons.reduce((max, season) => Math.max(max, seasonOrdinal(season.seasonLabel) ?? 0), 0);
    if (maxOrdinal > showSeasons.length) {
      const show = showsById.get(showId);
      warnings.push({
        code: "inferred-season-gap",
        message: `${show?.displayTitle ?? showId} has ${showSeasons.length} listed season rows but at least ${maxOrdinal} known seasons`,
        refs: showSeasons.map((season) => `${season.id}:row-${season.sourceRow}`),
      });
    }
  }
  return warnings;
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

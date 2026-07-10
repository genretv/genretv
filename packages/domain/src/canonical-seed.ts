import { createHash } from "node:crypto";

type ScheduleSection = "current" | "upcoming" | "past";
export type ShowLifecycleStatus = "open" | "ended" | "cancelled";
export type ReleaseKind = "season" | "special" | "movie" | "pilot" | "other";

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
    number?: number | null;
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
  generatedAt?: string;
  source?: { updatedLabel?: string | null };
  entries: BlogspotSeedEntry[];
}

export interface CanonicalShowSeedRow {
  id: string;
  displayTitle: string;
  originalTitle: string | null;
  lifecycleStatus: ShowLifecycleStatus;
  endedReason: string | null;
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
  seasonNumber: number | null;
  seasonLabel: string | null;
  title: string | null;
  releaseKind: ReleaseKind;
  isFinal: boolean;
  timing: string;
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
const releaseSeasonMidpoints: Record<string, { month: number; day: number }> = {
  winter: { month: 2, day: 15 },
  spring: { month: 4, day: 15 },
  summer: { month: 7, day: 15 },
  autumn: { month: 10, day: 15 },
};

export function buildCanonicalRegistrySeedRows(seed: BlogspotCanonicalSeed): CanonicalRegistrySeedRows {
  const shows = new Map<string, CanonicalShowSeedRow>();
  const seasons = new Map<string, CanonicalSeasonSeedRow>();
  const entriesWithShows: Array<{ entry: BlogspotSeedEntry; showId: string }> = [];
  const titleIdentities = titleExternalIdentities(seed.entries);
  const sourceDate = sourceCalendarDate(seed);

  for (const entry of seed.entries) {
    const showId = stableUuid(showIdentityKey(entry, titleIdentities));
    const existing = shows.get(showId);
    const lifecycle = lifecycleFor(entry);
    const show =
      existing ??
      ({
        id: showId,
        displayTitle: entry.show.displayTitle,
        originalTitle: entry.show.originalTitle ?? null,
        lifecycleStatus: "open",
        endedReason: null,
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
    if (lifecycleRank(lifecycle.status) > lifecycleRank(show.lifecycleStatus)) {
      show.lifecycleStatus = lifecycle.status;
      show.endedReason = lifecycle.reason;
    } else if (lifecycle.status === show.lifecycleStatus && lifecycle.reason != null) {
      show.endedReason = show.endedReason ?? lifecycle.reason;
    }
    shows.set(showId, show);
    entriesWithShows.push({ entry, showId });

    const seasonNumber = entry.season.number ?? seasonOrdinalFromRaw(entry.season.rawSeason);
    if (seasonNumber != null) {
      for (let number = 1; number <= seasonNumber; number += 1) {
        ensureHistoricalSeason(seasons, showId, number, entry.sourceRow);
      }
    }

    const releaseKind: ReleaseKind = entry.season.extraMovie ? "special" : seasonNumber == null ? "other" : "season";
    const identity =
      releaseKind === "season" ? numberedSeasonIdentity(showId, seasonNumber!) : `${showId}:${releaseKind}:${entry.id}`;
    const releaseWindow = resolveWindowYear(entry.season.releaseWindow, entry.section, sourceDate);
    const finaleWindow = resolveWindowYear(entry.season.finaleWindow, entry.section, sourceDate);
    const row: CanonicalSeasonSeedRow = {
      // Preserve the original scraped-row identity because personal overlays may
      // already reference it; only inferred rows receive structured new IDs.
      id: stableUuid(`season:${entry.id}`),
      showId,
      section: entry.section,
      seasonNumber: releaseKind === "season" ? seasonNumber : null,
      seasonLabel: releaseKind === "other" ? entry.season.rawSeason.trim() || null : null,
      title: null,
      releaseKind,
      isFinal: markerMeanings(entry).includes("final_season"),
      timing: timingFor(entry),
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
    };
    seasons.set(identity, mergeSeasonRows(seasons.get(identity), row));
  }

  // Renewal markers describe already-funded future releases. They become ordinary
  // Season rows so schedule placement remains a local query over persisted data.
  for (const { entry, showId } of entriesWithShows) {
    const currentNumber = entry.season.number ?? seasonOrdinalFromRaw(entry.season.rawSeason);
    if (currentNumber == null) continue;
    const meanings = markerMeanings(entry);
    const extraGreenlit = greenlitSeasonCount(meanings);
    if (extraGreenlit === 0) continue;
    const anchor = resolveWindowYear(
      entry.season.releaseWindow ?? entry.season.finaleWindow,
      entry.section,
      sourceDate,
    );
    for (let offset = 1; offset <= extraGreenlit; offset += 1) {
      const number = currentNumber + offset;
      const identity = numberedSeasonIdentity(showId, number);
      if (seasons.has(identity)) continue;
      const releaseWindow = estimatedFollowingWindow(anchor, sourceDate.year, offset);
      seasons.set(identity, {
        id: stableUuid(`season:${identity}`),
        showId,
        section: "upcoming",
        seasonNumber: number,
        seasonLabel: null,
        title: null,
        releaseKind: "season",
        isFinal: meanings.includes("renewed_for_final_season") && offset === extraGreenlit,
        timing: releaseWindow.raw,
        releasePattern: "unknown",
        releasePrecision: releaseWindow.precision,
        dateConfidence: releaseWindow.confidence,
        releaseWindow,
        finaleWindow: null,
        sortKey: sortKeyFor(releaseWindow),
        episodeCount: null,
        sourceRow: entry.sourceRow,
        organizations: entry.organizations,
        externalLinks: [],
        notes: null,
      });
    }
  }

  return {
    shows: [...shows.values()].sort((left, right) => left.displayTitle.localeCompare(right.displayTitle)),
    seasons: [...seasons.values()].sort(compareSeasonRows),
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
      refs: seasons.map((season) => `${season.showId}:${displaySeasonIdentity(season)}`),
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

  const seasonsByShow = new Map<string, CanonicalSeasonSeedRow[]>();
  for (const season of rows.seasons)
    seasonsByShow.set(season.showId, [...(seasonsByShow.get(season.showId) ?? []), season]);
  for (const show of rows.shows) {
    const showSeasons = seasonsByShow.get(show.id) ?? [];
    if (showSeasons.length === 0) {
      errors.push({
        code: "show-without-season",
        message: `${show.displayTitle} has no release rows`,
        refs: [show.id],
      });
      continue;
    }
    const numbered = showSeasons.filter((season) => season.releaseKind === "season" && season.seasonNumber != null);
    const duplicateNumbers = duplicateGroups(numbered, (season) => String(season.seasonNumber));
    for (const [number, duplicates] of duplicateNumbers) {
      errors.push({
        code: "duplicate-season-identity",
        message: `${show.displayTitle} has ${duplicates.length} rows for season ${number}`,
        refs: duplicates.map((season) => `${season.id}:row-${season.sourceRow}`),
      });
    }
    const maxNumber = numbered.reduce((max, season) => Math.max(max, season.seasonNumber ?? 0), 0);
    const knownNumbers = new Set(numbered.map((season) => season.seasonNumber));
    for (let number = 1; number <= maxNumber; number += 1) {
      if (!knownNumbers.has(number)) {
        errors.push({
          code: "missing-numbered-season-row",
          message: `${show.displayTitle} is missing known season ${number}`,
          refs: [show.id],
        });
      }
    }
  }

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

  const seasonGapErrors = errors.filter((issue) => issue.code === "missing-numbered-season-row");
  return {
    errors,
    warnings,
    stats: {
      duplicateDisplayTitleCount: warnings.filter((issue) => issue.code === "duplicate-display-title").length,
      inferredSeasonGapCount: seasonGapErrors.length,
      missingCountryCount: showsWithoutCountries.length,
      shows: rows.shows.length,
      seasons: rows.seasons.length,
      episodes: rows.episodes.length,
    },
  };
}

function ensureHistoricalSeason(
  seasons: Map<string, CanonicalSeasonSeedRow>,
  showId: string,
  seasonNumber: number,
  sourceRow: number,
): void {
  const identity = numberedSeasonIdentity(showId, seasonNumber);
  if (seasons.has(identity)) return;
  seasons.set(identity, {
    id: stableUuid(`season:${identity}`),
    showId,
    section: "past",
    seasonNumber,
    seasonLabel: null,
    title: null,
    releaseKind: "season",
    isFinal: false,
    timing: "",
    releasePattern: null,
    releasePrecision: "unknown",
    dateConfidence: "unknown",
    releaseWindow: null,
    finaleWindow: null,
    sortKey: null,
    episodeCount: null,
    sourceRow,
    organizations: [],
    externalLinks: [],
    notes: null,
  });
}

function mergeSeasonRows(
  existing: CanonicalSeasonSeedRow | undefined,
  incoming: CanonicalSeasonSeedRow,
): CanonicalSeasonSeedRow {
  if (existing == null) return incoming;
  return {
    ...existing,
    ...incoming,
    seasonLabel: incoming.seasonLabel ?? existing.seasonLabel,
    title: incoming.title ?? existing.title,
    organizations: mergeOrganizations(existing.organizations, incoming.organizations),
    externalLinks: mergeLinks(existing.externalLinks, incoming.externalLinks),
    notes: joinNotes([existing.notes, incoming.notes]),
  };
}

function mergeOrganizations(
  left: CanonicalSeasonSeedRow["organizations"],
  right: CanonicalSeasonSeedRow["organizations"],
): CanonicalSeasonSeedRow["organizations"] {
  const organizations = new Map<string, CanonicalSeasonSeedRow["organizations"][number]>();
  for (const organization of [...left, ...right]) {
    organizations.set(`${organization.role}:${organization.name}`.toLocaleLowerCase(), organization);
  }
  return [...organizations.values()];
}

function lifecycleFor(entry: BlogspotSeedEntry): { status: ShowLifecycleStatus; reason: string | null } {
  const meanings = markerMeanings(entry);
  if (meanings.includes("cancelled")) return { status: "cancelled", reason: entry.season.legacyStatus || "Canceled" };
  if (entry.section === "past" && meanings.includes("final_season")) {
    return { status: "ended", reason: entry.season.legacyStatus || "Final season" };
  }
  const normalized = entry.season.legacyStatus.trim().toLocaleLowerCase();
  if (entry.section === "past" && /cancel/.test(normalized))
    return { status: "cancelled", reason: entry.season.legacyStatus };
  if (entry.section === "past" && /(?:ended|finished|completed|final)/.test(normalized)) {
    return { status: "ended", reason: entry.season.legacyStatus };
  }
  return { status: "open", reason: null };
}

function lifecycleRank(status: ShowLifecycleStatus): number {
  if (status === "cancelled") return 2;
  if (status === "ended") return 1;
  return 0;
}

function markerMeanings(entry: BlogspotSeedEntry): string[] {
  return entry.season.lifecycleMarkers.flatMap((marker) => {
    const meaning = typeof marker === "string" ? marker : marker.meaning;
    return meaning == null || meaning === "" ? [] : [meaning];
  });
}

function greenlitSeasonCount(meanings: readonly string[]): number {
  const explicitCount = meanings.reduce((count, meaning) => {
    const match = /^legacy_x(\d+)$/.exec(meaning);
    return Math.max(count, match?.[1] == null ? 0 : Number(match[1]));
  }, 0);
  if (explicitCount > 0) return explicitCount;
  return meanings.includes("renewed") || meanings.includes("renewed_for_final_season") ? 1 : 0;
}

function estimatedFollowingWindow(
  anchor: ReleaseWindowSeed | null,
  sourceYear: number,
  offset: number,
): ReleaseWindowSeed {
  const anchorYear = anchor?.year ?? sourceYear;
  const releaseSeason = anchor?.releaseSeason ?? meteorologicalSeason(anchor?.month ?? 7);
  const year = anchorYear + offset;
  const label = `${capitalize(releaseSeason)} ${year}`;
  return {
    raw: label,
    precision: "release_season",
    confidence: "estimated",
    year,
    month: null,
    day: null,
    releaseSeason,
  };
}

function meteorologicalSeason(month: number): string {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function sourceCalendarDate(seed: BlogspotCanonicalSeed): { year: number; month: number; day: number } {
  const label = seed.source?.updatedLabel ?? "";
  const match = /([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s*(\d{4})/.exec(label);
  if (match?.[1] != null && match[2] != null && match[3] != null) {
    const month = monthNumber(match[1]);
    if (month != null) return { year: Number(match[3]), month, day: Number(match[2]) };
  }
  const generated = seed.generatedAt == null ? null : new Date(seed.generatedAt);
  if (generated != null && !Number.isNaN(generated.valueOf())) {
    return { year: generated.getUTCFullYear(), month: generated.getUTCMonth() + 1, day: generated.getUTCDate() };
  }
  return { year: 1970, month: 7, day: 1 };
}

function monthNumber(value: string): number | null {
  const index = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
    value.slice(0, 3).toLocaleLowerCase(),
  );
  return index < 0 ? null : index + 1;
}

function resolveWindowYear(
  window: ReleaseWindowSeed | null,
  section: ScheduleSection,
  sourceDate: { year: number; month: number; day: number },
): ReleaseWindowSeed | null {
  if (window == null || window.year != null) return window;
  const referenceMonth = window.month ?? releaseSeasonMidpoints[window.releaseSeason ?? ""]?.month;
  let year = sourceDate.year;
  if (referenceMonth != null && section === "upcoming" && referenceMonth < sourceDate.month) year += 1;
  if (referenceMonth != null && section === "past" && referenceMonth > sourceDate.month) year -= 1;
  return { ...window, year };
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
  for (const value of right) if (value !== "" && !values.includes(value)) values.push(value);
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
  for (const link of [...left, ...right]) links.set(link.url, link);
  return [...links.values()];
}

function joinNotes(notes: readonly (string | null)[]): string | null {
  const unique = appendUnique(
    [],
    notes.flatMap((note) => (typeof note === "string" && note.trim() !== "" ? [note.trim()] : [])),
  );
  return unique.length === 0 ? null : unique.join("\n\n");
}

function numberedSeasonIdentity(showId: string, seasonNumber: number): string {
  return `${showId}:season:${seasonNumber}`;
}

function displaySeasonIdentity(season: CanonicalSeasonSeedRow): string {
  if (season.releaseKind === "season" && season.seasonNumber != null) return `S${season.seasonNumber}`;
  return season.seasonLabel ?? season.title ?? season.releaseKind;
}

function seasonOrdinalFromRaw(value: string): number | null {
  const match = /^(\d+)/.exec(value.trim());
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
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

function compareSeasonRows(left: CanonicalSeasonSeedRow, right: CanonicalSeasonSeedRow): number {
  const sourceOrder = left.sourceRow - right.sourceRow;
  if (sourceOrder !== 0) return sourceOrder;
  const numberOrder = (left.seasonNumber ?? Number.MAX_SAFE_INTEGER) - (right.seasonNumber ?? Number.MAX_SAFE_INTEGER);
  if (numberOrder !== 0) return numberOrder;
  return left.id.localeCompare(right.id);
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

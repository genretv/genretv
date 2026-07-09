export type ScheduleSection = "current" | "upcoming" | "past";
export type EndingFilter = "all" | "canceled" | "finished" | "unknown";
export type ScheduleSort = "source" | "title" | "organization";
export type ManagementSort = "title" | "seasonCount" | "organization";
export type PageSize = (typeof pageSizeOptions)[number];

export const pageSizeOptions = [20, 50, 100] as const;
export const defaultPageSize: PageSize = 50;

export interface ExternalLinkSeed {
  kind?: string;
  label: string;
  url: string;
}

export interface ReleaseWindowSeed {
  raw: string;
  precision: string;
  confidence: string;
  year: number | null;
  month: number | null;
  day: number | null;
  releaseSeason: string | null;
}

export interface BlogspotEntrySeed {
  id: string;
  section: ScheduleSection;
  sourceRow: number;
  show: {
    displayTitle: string;
    externalLinks: ExternalLinkSeed[];
    languages: string[];
    countries?: string[];
  };
  season: {
    rawSeason: string;
    labelKind: string;
    number?: number;
    tentative: boolean;
    extraMovie: boolean;
    hiatus: boolean;
    releasePattern: string | null;
    releaseWindow: ReleaseWindowSeed | null;
    finaleWindow: ReleaseWindowSeed | null;
    lifecycleMarkers: string[];
    legacyStatus: string;
    legacyTiming: string;
  };
  organizations: Array<{ name: string; role: string; externalLinks: ExternalLinkSeed[] }>;
  genreTags: string[];
  notes: string[];
  legacy: {
    genreText: string;
    organizationText: string;
    detailText: string;
    cells: string[];
  };
}

export interface BlogspotCanonicalSeed {
  generatedAt: string;
  source: {
    pageTitle: string;
    updatedLabel: string;
    url: string;
  };
  summary: {
    totalEntries: number;
    bySection: Record<ScheduleSection, number>;
  };
  entries: BlogspotEntrySeed[];
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

export interface CanonicalRegistrySeed {
  schemaVersion: 1;
  generatedAt: string | null;
  source: {
    pageTitle?: string;
    updatedLabel?: string;
    url?: string;
  } | null;
  summary: {
    shows: number;
    seasons: number;
    episodes: number;
  };
  rows: {
    shows: CanonicalShowSeedRow[];
    seasons: CanonicalSeasonSeedRow[];
    episodes: CanonicalEpisodeSeedRow[];
  };
}

export interface ScheduleEntry {
  id: string;
  showId: string;
  sourceRow: number;
  section: ScheduleSection;
  title: string;
  originalTitle: string | null;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  endingKind: Exclude<EndingFilter, "all">;
  organizationText: string;
  organizations: string[];
  genreText: string;
  genres: string[];
  languages: string[];
  countries: string[];
  showLinks: ExternalLinkSeed[];
  links: ExternalLinkSeed[];
  seasonLinks: ExternalLinkSeed[];
  notes: string | null;
  seasonNotes: string | null;
  releasePattern: string | null;
  releasePrecision: string;
  dateConfidence: string;
  releaseWindow: ReleaseWindowSeed | null;
  finaleWindow: ReleaseWindowSeed | null;
  sortKey: string | null;
  legacyCells: string[];
  episodeCount: number | null;
  episodes: ScheduleEpisode[];
}

export interface ScheduleEpisode {
  id: string;
  episodeLabel: string;
  title: string;
  releaseDate: string;
  releaseWindow: ReleaseWindowSeed | null;
  sortKey: string | null;
  notes: string | null;
  links: ExternalLinkSeed[];
}

export interface ManagementSeason {
  id: string;
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
  organizationText: string;
  organizations: string[];
  genreText: string;
  languages: string[];
  countries: string[];
  sourceRow: number;
  episodeCount: number | null;
  notes: string | null;
  links: ExternalLinkSeed[];
  episodes: ScheduleEpisode[];
}

export interface ManagementShow {
  id: string;
  title: string;
  originalTitle: string | null;
  languages: string[];
  organizations: string[];
  genres: string[];
  links: ExternalLinkSeed[];
  countries: string[];
  notes: string | null;
  listedSeasonCount: number;
  knownSeasonCount: number;
  seasons: ManagementSeason[];
}

export interface CanonicalSchedule {
  title: string;
  sourceUrl: string;
  updatedLabel: string;
  generatedAt: string;
  entries: ScheduleEntry[];
  counts: Record<ScheduleSection, number>;
}

export interface ScheduleViewPreferences {
  section: ScheduleSection;
  query: string;
  languages: string[];
  countries: string[];
  organization: string;
  ending: EndingFilter;
  sort: ScheduleSort;
  pageSize: PageSize;
}

export interface ManagementViewPreferences {
  query: string;
  organization: string;
  languages: string[];
  countries: string[];
  sort: ManagementSort;
  pageSize: PageSize;
}

export const defaultScheduleViewPreferences: ScheduleViewPreferences = {
  section: "current",
  query: "",
  languages: [],
  countries: [],
  organization: "all",
  ending: "all",
  sort: "source",
  pageSize: defaultPageSize,
};

export const defaultManagementViewPreferences: ManagementViewPreferences = {
  query: "",
  organization: "all",
  languages: [],
  countries: [],
  sort: "title",
  pageSize: defaultPageSize,
};

export const sectionLabels: Record<ScheduleSection, string> = {
  current: "Now Showing",
  upcoming: "Upcoming",
  past: "Finished",
};

const lifecycleLabels: Record<string, string> = {
  cancelled: "Canceled",
  final_season: "Final season",
  renewed_for_final_season: "Renewed for final season",
  renewed: "Renewed",
  moving_to_new_channel: "Moved",
};
const defaultLanguage = "en";

export function buildScheduleFromSeed(seed: BlogspotCanonicalSeed): CanonicalSchedule {
  return {
    title: seed.source.pageTitle,
    sourceUrl: seed.source.url,
    updatedLabel: seed.source.updatedLabel,
    generatedAt: seed.generatedAt,
    counts: seed.summary.bySection,
    entries: seed.entries.map(toScheduleEntry),
  };
}

export function buildScheduleFromRegistrySeed(seed: CanonicalRegistrySeed): CanonicalSchedule {
  return buildScheduleFromRegistryRows(seed.rows, {
    title: seed.source?.pageTitle ?? "GenreTV",
    sourceUrl: seed.source?.url ?? "",
    updatedLabel: seed.source?.updatedLabel ?? "",
    generatedAt: seed.generatedAt ?? "",
  });
}

export function buildScheduleFromRegistryRows(
  rows: CanonicalRegistrySeed["rows"],
  metadata: Pick<CanonicalSchedule, "generatedAt" | "sourceUrl" | "title" | "updatedLabel">,
): CanonicalSchedule {
  const showsById = new Map(rows.shows.map((show) => [show.id, show]));
  const episodesBySeason = groupEpisodesBySeason(rows.episodes);
  const entries = rows.seasons
    .map((season) => {
      const show = showsById.get(season.showId);
      return show == null ? null : toRegistryScheduleEntry(show, season, episodesBySeason.get(season.id) ?? []);
    })
    .filter((entry): entry is ScheduleEntry => entry != null);

  return {
    title: metadata.title,
    sourceUrl: metadata.sourceUrl,
    updatedLabel: metadata.updatedLabel,
    generatedAt: metadata.generatedAt,
    counts: countBySection(entries),
    entries,
  };
}

export function filterScheduleEntries(
  entries: readonly ScheduleEntry[],
  preferences: ScheduleViewPreferences,
): ScheduleEntry[] {
  const query = preferences.query.trim().toLocaleLowerCase();
  const filtered = entries.filter((entry) => {
    if (entry.section !== preferences.section) return false;
    if (!hasAnySelected(entry.languages, preferences.languages)) return false;
    if (!hasAnySelected(entry.countries, preferences.countries)) return false;
    if (preferences.organization !== "all" && !entry.organizations.includes(preferences.organization)) return false;
    if (preferences.section === "past" && preferences.ending !== "all" && entry.endingKind !== preferences.ending) {
      return false;
    }
    if (query === "") return true;
    return [
      entry.title,
      entry.seasonLabel,
      entry.timing,
      entry.endedReason,
      entry.organizationText,
      entry.genreText,
      entry.languages.join(" "),
      entry.countries.join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });

  return [...filtered].sort((left, right) => compareEntries(left, right, preferences.sort));
}

export function scheduleFilterOptions(entries: readonly ScheduleEntry[]) {
  return {
    languages: uniqueSorted(entries.flatMap((entry) => entry.languages)),
    countries: uniqueSorted(entries.flatMap((entry) => entry.countries)),
    organizations: uniqueSorted(entries.flatMap((entry) => entry.organizations)),
  };
}

export function paginateItems<T>(items: readonly T[], page: number, pageSize: PageSize): T[] {
  const safePage = Math.max(1, Math.floor(page));
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function pageCountFor(totalItems: number, pageSize: PageSize): number {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function formatEpisodeCount(episodeCount: number | null, episodes: readonly ScheduleEpisode[]): string {
  const knownCount = episodeCount ?? (episodes.length > 0 ? episodes.length : null);
  return knownCount == null ? "Unknown" : String(knownCount);
}

export function formatKnownSeasonCount(show: Pick<ManagementShow, "knownSeasonCount" | "listedSeasonCount">): string {
  return show.knownSeasonCount > show.listedSeasonCount ? `${show.knownSeasonCount}+` : String(show.knownSeasonCount);
}

export function buildManagementShows(entries: readonly ScheduleEntry[]): ManagementShow[] {
  const shows = new Map<string, ManagementShow>();
  for (const entry of entries) {
    const id = entry.showId;
    const existing = shows.get(id);
    const show =
      existing ??
      ({
        id,
        title: entry.title,
        originalTitle: entry.originalTitle,
        languages: [],
        organizations: [],
        genres: [],
        links: [],
        countries: [],
        notes: entry.notes,
        listedSeasonCount: 0,
        knownSeasonCount: 0,
        seasons: [],
      } satisfies ManagementShow);

    show.languages = uniqueSorted([...show.languages, ...entry.languages]);
    show.countries = uniqueSorted([...show.countries, ...entry.countries]);
    show.organizations = uniqueSorted([...show.organizations, ...entry.organizations]);
    show.genres = uniqueSorted([...show.genres, ...entry.genres]);
    show.links = mergeLinks(show.links, entry.showLinks);
    show.notes = joinNotes([show.notes, entry.notes]);
    show.seasons.push({
      id: entry.id,
      section: entry.section,
      seasonLabel: entry.seasonLabel,
      timing: entry.timing,
      endedReason: entry.endedReason,
      releasePattern: entry.releasePattern,
      releasePrecision: entry.releasePrecision,
      dateConfidence: entry.dateConfidence,
      releaseWindow: entry.releaseWindow,
      finaleWindow: entry.finaleWindow,
      sortKey: entry.sortKey,
      organizationText: entry.organizationText,
      organizations: entry.organizations,
      genreText: entry.genreText,
      languages: entry.languages,
      countries: entry.countries,
      sourceRow: entry.sourceRow,
      episodeCount: entry.episodeCount,
      notes: entry.seasonNotes,
      links: entry.seasonLinks,
      episodes: entry.episodes,
    });

    shows.set(id, show);
  }

  return [...shows.values()]
    .map((show) => {
      const seasons = [...show.seasons].sort((left, right) => left.sourceRow - right.sourceRow);
      return {
        ...show,
        listedSeasonCount: seasons.length,
        knownSeasonCount: inferKnownSeasonCount(seasons),
        seasons,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function filterManagementShows(
  shows: readonly ManagementShow[],
  preferences: ManagementViewPreferences,
): ManagementShow[] {
  const normalizedQuery = preferences.query.trim().toLocaleLowerCase();
  const filtered = shows.filter((show) => {
    if (preferences.organization !== "all" && !show.organizations.includes(preferences.organization)) return false;
    if (!hasAnySelected(show.languages, preferences.languages)) return false;
    if (!hasAnySelected(show.countries, preferences.countries)) return false;
    if (normalizedQuery === "") return true;
    return [
      show.title,
      show.organizations.join(" "),
      show.genres.join(" "),
      show.languages.join(" "),
      show.countries.join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
  return [...filtered].sort((left, right) => compareManagementShows(left, right, preferences.sort));
}

export function findManagementShow(shows: readonly ManagementShow[], showId: string): ManagementShow | null {
  return shows.find((show) => show.id === showId) ?? null;
}

export function findManagementSeason(
  shows: readonly ManagementShow[],
  showId: string,
  seasonId: string,
): { show: ManagementShow; season: ManagementSeason } | null {
  const show = findManagementShow(shows, showId);
  const season = show?.seasons.find((candidate) => candidate.id === seasonId);
  return show != null && season != null ? { show, season } : null;
}

function toScheduleEntry(entry: BlogspotEntrySeed): ScheduleEntry {
  const organizations = entry.organizations.map((organization) => organization.name).filter(Boolean);
  const genreText = entry.genreTags.join(", ") || entry.legacy.genreText;
  const endedReason = stopReasonFor(entry);
  const languages = normalizeLanguages(entry.show.languages);
  const countries = entry.show.countries ?? [];
  return {
    id: entry.id,
    showId: showIdForTitle(entry.show.displayTitle),
    sourceRow: entry.sourceRow,
    section: entry.section,
    title: entry.show.displayTitle,
    originalTitle: null,
    seasonLabel: seasonLabel(entry),
    timing: timingFor(entry),
    endedReason,
    endingKind: endingKindFor(endedReason),
    organizationText: organizations.length > 0 ? organizations.join(", ") : entry.legacy.organizationText,
    organizations,
    genreText,
    genres: entry.genreTags,
    languages,
    countries,
    showLinks: entry.show.externalLinks,
    links: entry.show.externalLinks,
    seasonLinks: [],
    notes: entry.notes.length > 0 ? entry.notes.join("\n\n") : null,
    seasonNotes: entry.notes.length > 0 ? entry.notes.join("\n\n") : null,
    releasePattern: entry.season.releasePattern,
    releasePrecision: entry.season.releaseWindow?.precision ?? "unknown",
    dateConfidence: entry.season.releaseWindow?.confidence ?? "unknown",
    releaseWindow: entry.season.releaseWindow,
    finaleWindow: entry.season.finaleWindow,
    sortKey: null,
    legacyCells: entry.legacy.cells,
    episodeCount: null,
    episodes: [],
  };
}

function toRegistryScheduleEntry(
  show: CanonicalShowSeedRow,
  season: CanonicalSeasonSeedRow,
  episodes: readonly CanonicalEpisodeSeedRow[],
): ScheduleEntry {
  const organizations = season.organizations.map((organization) => organization.name).filter(Boolean);
  const genreText = show.genreTags.join(", ");
  const languages = normalizeLanguages(show.languages);
  const links = mergeLinks(show.externalLinks, season.externalLinks);
  return {
    id: season.id,
    showId: show.id,
    sourceRow: season.sourceRow,
    section: season.section,
    title: show.displayTitle,
    originalTitle: show.originalTitle,
    seasonLabel: season.seasonLabel,
    timing: season.timing || formatRegistryTiming(season),
    endedReason: season.endedReason || "Unknown",
    endingKind: endingKindFor(season.endedReason),
    organizationText: organizations.join(", "),
    organizations,
    genreText,
    genres: show.genreTags,
    languages,
    countries: show.countries,
    showLinks: show.externalLinks,
    links,
    seasonLinks: season.externalLinks,
    notes: show.notes,
    seasonNotes: season.notes,
    releasePattern: season.releasePattern,
    releasePrecision: season.releasePrecision,
    dateConfidence: season.dateConfidence,
    releaseWindow: season.releaseWindow,
    finaleWindow: season.finaleWindow,
    sortKey: season.sortKey,
    legacyCells: [],
    episodeCount: season.episodeCount,
    episodes: episodes.map(toScheduleEpisode),
  };
}

function groupEpisodesBySeason(episodes: readonly CanonicalEpisodeSeedRow[]): Map<string, CanonicalEpisodeSeedRow[]> {
  const bySeason = new Map<string, CanonicalEpisodeSeedRow[]>();
  for (const episode of episodes) {
    bySeason.set(episode.seasonId, [...(bySeason.get(episode.seasonId) ?? []), episode]);
  }
  for (const [seasonId, seasonEpisodes] of bySeason) {
    bySeason.set(seasonId, [...seasonEpisodes].sort(compareSeedEpisodes));
  }
  return bySeason;
}

function toScheduleEpisode(episode: CanonicalEpisodeSeedRow): ScheduleEpisode {
  return {
    id: episode.id,
    episodeLabel: episode.episodeLabel ?? "",
    title: episode.title ?? "",
    releaseDate: formatWindow(episode.releaseWindow),
    releaseWindow: episode.releaseWindow,
    sortKey: episode.sortKey,
    notes: episode.notes,
    links: episode.externalLinks,
  };
}

function countBySection(entries: readonly ScheduleEntry[]): Record<ScheduleSection, number> {
  return {
    current: entries.filter((entry) => entry.section === "current").length,
    upcoming: entries.filter((entry) => entry.section === "upcoming").length,
    past: entries.filter((entry) => entry.section === "past").length,
  };
}

function hasAnySelected(values: readonly string[], selected: readonly string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

function compareEntries(left: ScheduleEntry, right: ScheduleEntry, sort: ScheduleSort): number {
  if (sort === "title") return left.title.localeCompare(right.title);
  if (sort === "organization") {
    return left.organizationText.localeCompare(right.organizationText) || left.sourceRow - right.sourceRow;
  }
  return left.sourceRow - right.sourceRow;
}

function compareManagementShows(left: ManagementShow, right: ManagementShow, sort: ManagementSort): number {
  if (sort === "seasonCount")
    return right.knownSeasonCount - left.knownSeasonCount || left.title.localeCompare(right.title);
  if (sort === "organization") {
    return (
      left.organizations.join(", ").localeCompare(right.organizations.join(", ")) ||
      left.title.localeCompare(right.title)
    );
  }
  return left.title.localeCompare(right.title);
}

function inferKnownSeasonCount(seasons: readonly Pick<ManagementSeason, "seasonLabel">[]): number {
  return seasons.reduce((count, season) => Math.max(count, seasonOrdinal(season.seasonLabel) ?? 0), seasons.length);
}

function seasonOrdinal(label: string): number | null {
  const normalized = label.trim();
  const match = /^(?:s|season|series)\s*(\d+)\??$/i.exec(normalized);
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

function compareSeedEpisodes(left: CanonicalEpisodeSeedRow, right: CanonicalEpisodeSeedRow): number {
  return (
    compareNullableStrings(left.sortKey, right.sortKey) ||
    compareNullableStrings(left.episodeLabel, right.episodeLabel) ||
    compareNullableStrings(left.title, right.title) ||
    left.id.localeCompare(right.id)
  );
}

function compareNullableStrings(left: string | null, right: string | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return left.localeCompare(right);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value !== ""))].sort((left, right) => left.localeCompare(right));
}

function normalizeLanguages(languages: readonly string[]): string[] {
  return languages.length > 0 ? [...languages] : [defaultLanguage];
}

function mergeLinks(left: readonly ExternalLinkSeed[], right: readonly ExternalLinkSeed[]): ExternalLinkSeed[] {
  const byUrl = new Map<string, ExternalLinkSeed>();
  for (const link of [...left, ...right]) {
    byUrl.set(link.url, link);
  }
  return [...byUrl.values()];
}

function joinNotes(notes: readonly (string | null)[]): string | null {
  const text = notes.filter((note): note is string => typeof note === "string" && note.trim() !== "").join("\n\n");
  return text === "" ? null : text;
}

function showIdForTitle(title: string): string {
  const slug = title
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "untitled";
}

function formatWindow(window: ReleaseWindowSeed | null): string {
  if (window == null) return "";
  if (window.raw !== "") return window.raw;
  if (window.releaseSeason != null && window.year != null) return `${window.releaseSeason} ${window.year}`;
  if (window.year != null) return String(window.year);
  return "";
}

function timingFor(entry: BlogspotEntrySeed): string {
  const release = formatWindow(entry.season.releaseWindow);
  const finale = formatWindow(entry.season.finaleWindow);
  if (entry.section === "current") {
    return [entry.season.legacyTiming, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  }
  if (entry.section === "upcoming") {
    return [release || entry.season.legacyTiming, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  }
  return entry.legacy.detailText || entry.season.legacyStatus || "past";
}

function formatRegistryTiming(season: CanonicalSeasonSeedRow): string {
  const release = formatWindow(season.releaseWindow);
  const finale = formatWindow(season.finaleWindow);
  return [release, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
}

function stopReasonFor(entry: BlogspotEntrySeed): string {
  if (entry.season.legacyStatus !== "") return entry.season.legacyStatus;
  const markers = entry.season.lifecycleMarkers
    .map((marker) => lifecycleLabels[marker] ?? marker)
    .filter((marker) => marker !== "");
  return markers.length > 0 ? markers.join(", ") : "Unknown";
}

function endingKindFor(reason: string): Exclude<EndingFilter, "all"> {
  const normalized = reason.toLocaleLowerCase();
  if (normalized.startsWith("canceled")) return "canceled";
  if (normalized.startsWith("finished")) return "finished";
  return "unknown";
}

function seasonLabel(entry: BlogspotEntrySeed): string {
  const prefix = entry.season.extraMovie ? "Movie" : `S${entry.season.rawSeason || "?"}`;
  return entry.season.tentative ? `${prefix}?` : prefix;
}

export type SourceScheduleSection = "current" | "upcoming" | "past";
export type ScheduleSection = SourceScheduleSection | "waiting";
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
  section: SourceScheduleSection;
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
    bySection: Record<SourceScheduleSection, number>;
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
  section: SourceScheduleSection;
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
  sourceSection: SourceScheduleSection;
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
  section: SourceScheduleSection;
  scheduleSection: ScheduleSection;
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

export interface ScheduleBuildOptions {
  asOf?: string;
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
  waiting: "Awaiting Renewal or Cancellation",
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

export function buildScheduleFromSeed(
  seed: BlogspotCanonicalSeed,
  options: ScheduleBuildOptions = {},
): CanonicalSchedule {
  const entries = deriveSchedulePlacement(
    seed.entries.map(toScheduleEntry),
    seed.source.updatedLabel,
    seed.generatedAt,
    options,
  );
  return {
    title: seed.source.pageTitle,
    sourceUrl: seed.source.url,
    updatedLabel: seed.source.updatedLabel,
    generatedAt: seed.generatedAt,
    counts: countBySection(entries),
    entries,
  };
}

export function buildScheduleFromRegistrySeed(
  seed: CanonicalRegistrySeed,
  options: ScheduleBuildOptions = {},
): CanonicalSchedule {
  return buildScheduleFromRegistryRows(
    seed.rows,
    {
      title: seed.source?.pageTitle ?? "GenreTV",
      sourceUrl: seed.source?.url ?? "",
      updatedLabel: seed.source?.updatedLabel ?? "",
      generatedAt: seed.generatedAt ?? "",
    },
    options,
  );
}

export function buildScheduleFromRegistryRows(
  rows: CanonicalRegistrySeed["rows"],
  metadata: Pick<CanonicalSchedule, "generatedAt" | "sourceUrl" | "title" | "updatedLabel">,
  options: ScheduleBuildOptions = {},
): CanonicalSchedule {
  const showsById = new Map(rows.shows.map((show) => [show.id, show]));
  const episodesBySeason = groupEpisodesBySeason(rows.episodes);
  const entries = deriveSchedulePlacement(
    rows.seasons
      .map((season) => {
        const show = showsById.get(season.showId);
        return show == null ? null : toRegistryScheduleEntry(show, season, episodesBySeason.get(season.id) ?? []);
      })
      .filter((entry): entry is ScheduleEntry => entry != null),
    metadata.updatedLabel,
    metadata.generatedAt,
    options,
  );

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

export function formatScheduleSeasonCount(entry: Pick<ScheduleEntry, "seasonLabel">): string {
  const officialCount = seasonOrdinal(entry.seasonLabel);
  const extraCount = seasonExtraCount(entry.seasonLabel);
  if (officialCount == null && extraCount === 0) return entry.seasonLabel;
  const labels = [];
  if (officialCount != null) labels.push(String(officialCount));
  if (extraCount > 0) labels.push(`${extraCount} ${extraCount === 1 ? "special" : "specials"}`);
  return labels.join(" + ");
}

export function formatScheduleStatus(section: ScheduleSection, endedReason: string): string {
  if (section === "waiting" && isUnknownEndingReason(endedReason)) return sectionLabels.waiting;
  if (section === "waiting" || section === "past") return endedReason || "Unknown";
  return sectionLabels[section];
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
      section: entry.sourceSection,
      scheduleSection: entry.section,
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
    sourceSection: entry.section,
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
    sourceSection: season.section,
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
    waiting: entries.filter((entry) => entry.section === "waiting").length,
    past: entries.filter((entry) => entry.section === "past").length,
  };
}

const millisecondsPerDay = 86_400_000;
const bulkCurrentGraceDays = 35;
const monthNumbers: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};
const releaseSeasonMidpoints: Record<string, { month: number; day: number }> = {
  winter: { month: 2, day: 15 },
  spring: { month: 4, day: 15 },
  summer: { month: 7, day: 15 },
  autumn: { month: 10, day: 15 },
  fall: { month: 10, day: 15 },
};

interface CalendarDay {
  day: number;
  month: number;
  serial: number;
  year: number;
}

function deriveSchedulePlacement(
  entries: readonly ScheduleEntry[],
  updatedLabel: string,
  generatedAt: string,
  options: ScheduleBuildOptions,
): ScheduleEntry[] {
  const asOf = parseIsoCalendarDay(options.asOf) ?? localCalendarDayFromDate(new Date());
  const sourceReference = parseUpdatedCalendarDay(updatedLabel) ?? parseDateCalendarDay(generatedAt) ?? asOf;
  return entries.map((entry) => deriveEntryPlacement(entry, asOf, sourceReference));
}

function deriveEntryPlacement(entry: ScheduleEntry, asOf: CalendarDay, sourceReference: CalendarDay): ScheduleEntry {
  if (entry.sourceSection === "past") return entry;

  const sourceSection = entry.sourceSection;
  const releaseDay = resolveWindowDay(entry.releaseWindow, sourceSection, sourceReference);
  const episodeReleaseDays = entry.episodes
    .map((episode) => resolveWindowDay(episode.releaseWindow, sourceSection, sourceReference, releaseDay))
    .filter((day): day is CalendarDay => day != null);
  const firstEpisodeDay = minCalendarDay(episodeReleaseDays);
  const effectiveReleaseDay = minCalendarDay(
    [releaseDay, firstEpisodeDay].filter((day): day is CalendarDay => day != null),
  );
  const finaleDay = resolveWindowDay(entry.finaleWindow, sourceSection, sourceReference, effectiveReleaseDay);
  const completeEpisodeFinale =
    entry.episodeCount != null && entry.episodeCount > 0 && episodeReleaseDays.length >= entry.episodeCount
      ? maxCalendarDay(episodeReleaseDays)
      : null;
  const effectiveFinaleDay = maxCalendarDay(
    [finaleDay, completeEpisodeFinale].filter((day): day is CalendarDay => day != null),
  );

  let section: ScheduleSection = sourceSection;
  if (effectiveFinaleDay != null && effectiveFinaleDay.serial < asOf.serial) {
    section = completedSectionFor(entry.endedReason);
  } else if (effectiveReleaseDay != null && effectiveReleaseDay.serial > asOf.serial) {
    section = "upcoming";
  } else if (effectiveReleaseDay != null) {
    section =
      entry.releasePattern === "bulk" && effectiveReleaseDay.serial + bulkCurrentGraceDays < asOf.serial
        ? completedSectionFor(entry.endedReason)
        : "current";
  } else if (entry.releasePattern === "bulk" && sourceSection === "current") {
    section =
      sourceReference.serial + bulkCurrentGraceDays < asOf.serial ? completedSectionFor(entry.endedReason) : "current";
  }

  return section === sourceSection ? entry : { ...entry, section };
}

function resolveWindowDay(
  window: ReleaseWindowSeed | null,
  sourceSection: SourceScheduleSection,
  sourceReference: CalendarDay,
  notBefore: CalendarDay | null = null,
): CalendarDay | null {
  const monthDay = windowMonthDay(window);
  if (window == null || monthDay == null) return null;
  if (window.year != null) return calendarDay(window.year, monthDay.month, monthDay.day);

  if (notBefore != null) {
    const sameYear = calendarDay(notBefore.year, monthDay.month, monthDay.day);
    return sameYear.serial < notBefore.serial
      ? calendarDay(notBefore.year + 1, monthDay.month, monthDay.day)
      : sameYear;
  }

  if (sourceSection === "upcoming") {
    const sameYear = calendarDay(sourceReference.year, monthDay.month, monthDay.day);
    return sameYear.serial < sourceReference.serial
      ? calendarDay(sourceReference.year + 1, monthDay.month, monthDay.day)
      : sameYear;
  }

  return nearestCalendarDay(sourceReference, monthDay.month, monthDay.day);
}

function completedSectionFor(endedReason: string): Extract<ScheduleSection, "waiting" | "past"> {
  const normalized = endedReason.trim().toLocaleLowerCase();
  return /^(?:canceled|cancelled|finished|ended|completed|final season)/.test(normalized) ? "past" : "waiting";
}

function windowMonthDay(window: ReleaseWindowSeed | null): { month: number; day: number } | null {
  if (window == null) return null;
  if (window.month != null) return { month: window.month, day: window.day ?? 15 };
  if (window.releaseSeason != null) return releaseSeasonMidpoints[window.releaseSeason] ?? null;
  if (window.year != null) return { month: 7, day: 2 };
  return null;
}

function nearestCalendarDay(reference: CalendarDay, month: number, day: number): CalendarDay {
  return [reference.year - 1, reference.year, reference.year + 1]
    .map((year) => calendarDay(year, month, day))
    .sort((left, right) => Math.abs(left.serial - reference.serial) - Math.abs(right.serial - reference.serial))[0]!;
}

function minCalendarDay(days: readonly CalendarDay[]): CalendarDay | null {
  return days.reduce<CalendarDay | null>(
    (earliest, day) => (earliest == null || day.serial < earliest.serial ? day : earliest),
    null,
  );
}

function maxCalendarDay(days: readonly CalendarDay[]): CalendarDay | null {
  return days.reduce<CalendarDay | null>(
    (latest, day) => (latest == null || day.serial > latest.serial ? day : latest),
    null,
  );
}

function parseUpdatedCalendarDay(value: string): CalendarDay | null {
  const match = /updated\s+([a-z]+)\.?\s*(\d{1,2}),?\s*(\d{4})/i.exec(value);
  if (match?.[1] == null || match[2] == null || match[3] == null) return null;
  const month = monthNumbers[match[1].toLocaleLowerCase()];
  return month == null ? null : calendarDay(Number(match[3]), month, Number(match[2]));
}

function parseIsoCalendarDay(value: string | undefined): CalendarDay | null {
  if (value == null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match?.[1] == null || match[2] == null || match[3] == null
    ? null
    : calendarDay(Number(match[1]), Number(match[2]), Number(match[3]));
}

function parseDateCalendarDay(value: string): CalendarDay | null {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : utcCalendarDayFromDate(date);
}

function localCalendarDayFromDate(date: Date): CalendarDay {
  return calendarDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function utcCalendarDayFromDate(date: Date): CalendarDay {
  return calendarDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function calendarDay(year: number, month: number, day: number): CalendarDay {
  return { year, month, day, serial: Math.floor(Date.UTC(year, month - 1, day) / millisecondsPerDay) };
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
  return seasons.reduce((count, season) => Math.max(count, seasonOrdinal(season.seasonLabel) ?? 0), 0);
}

function seasonOrdinal(label: string): number | null {
  const normalized = label.trim();
  const match = /^(?:s|season|series)\s*(\d+)(?:\s*\+\s*(?:special|movie))?\??$/i.exec(normalized);
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

function seasonExtraCount(label: string): number {
  const normalized = label.trim();
  if (/^(?:special|movie)\??$/i.test(normalized)) return 1;
  return /^(?:s|season|series)\s*\d+\s*\+\s*(?:special|movie)\??$/i.test(normalized) ? 1 : 0;
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

function isUnknownEndingReason(reason: string): boolean {
  const normalized = reason.trim().toLocaleLowerCase();
  return normalized === "" || normalized === "unknown";
}

function seasonLabel(entry: BlogspotEntrySeed): string {
  const extraOrdinal = entry.season.extraMovie ? seasonOrdinalFromRaw(entry.season.rawSeason) : null;
  const prefix = entry.season.extraMovie
    ? extraOrdinal == null
      ? "Special"
      : `S${extraOrdinal} + special`
    : `S${entry.season.rawSeason || "?"}`;
  return entry.season.tentative ? `${prefix}?` : prefix;
}

function seasonOrdinalFromRaw(value: string): number | null {
  const match = /^(\d+)/.exec(value.trim());
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

export type SourceScheduleSection = "current" | "upcoming" | "past";
export type ScheduleSection = SourceScheduleSection | "waiting";
export type ShowLifecycleStatus = "open" | "ended" | "cancelled";
export type ReleaseKind = "season" | "special" | "movie" | "pilot" | "other";
export type EndingFilter = "all" | "canceled" | "finished" | "unknown";
export type ScheduleSort = "ending" | "genre" | "language" | "organization" | "seasons" | "title" | "when";
export type ScheduleSortDirection = "ascending" | "descending";
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
  section: SourceScheduleSection;
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
  section: ScheduleSection;
  sourceSection: SourceScheduleSection;
  title: string;
  originalTitle: string | null;
  seasonLabel: string;
  customSeasonLabel: string | null;
  seasonNumber: number | null;
  releaseTitle: string | null;
  releaseKind: ReleaseKind;
  isFinal: boolean;
  officialSeasonCount: number;
  specialCount: number;
  movieCount: number;
  timing: string;
  lifecycleStatus: ShowLifecycleStatus;
  endedReason: string | null;
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
  customSeasonLabel: string | null;
  seasonNumber: number | null;
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
  organizationText: string;
  organizations: string[];
  genreText: string;
  languages: string[];
  countries: string[];
  episodeCount: number | null;
  notes: string | null;
  links: ExternalLinkSeed[];
  episodes: ScheduleEpisode[];
}

export interface ManagementShow {
  id: string;
  title: string;
  originalTitle: string | null;
  lifecycleStatus: ShowLifecycleStatus;
  endedReason: string | null;
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
  allEntries: ScheduleEntry[];
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
  genres: string[];
  organization: string;
  ending: EndingFilter;
  sort: ScheduleSort;
  sortDirection: ScheduleSortDirection;
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
  genres: [],
  organization: "all",
  ending: "all",
  sort: "when",
  sortDirection: "ascending",
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

export function defaultScheduleSortDirection(sort: ScheduleSort, section: ScheduleSection): ScheduleSortDirection {
  return sort === "when" && section === "past" ? "descending" : "ascending";
}

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
  const allEntries = deriveSchedulePlacement(
    withReleaseCounts(seed.entries.map(toScheduleEntry)),
    seed.source.updatedLabel,
    seed.generatedAt,
    options,
  );
  const entries = projectScheduleEntries(allEntries);
  return {
    title: seed.source.pageTitle,
    sourceUrl: seed.source.url,
    updatedLabel: seed.source.updatedLabel,
    generatedAt: seed.generatedAt,
    counts: countBySection(entries),
    entries,
    allEntries,
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
  const allEntries = deriveSchedulePlacement(
    withReleaseCounts(
      rows.seasons
        .map((season) => {
          const show = showsById.get(season.showId);
          return show == null ? null : toRegistryScheduleEntry(show, season, episodesBySeason.get(season.id) ?? []);
        })
        .filter((entry): entry is ScheduleEntry => entry != null),
    ),
    metadata.updatedLabel,
    metadata.generatedAt,
    options,
  );
  const entries = projectScheduleEntries(allEntries);

  return {
    title: metadata.title,
    sourceUrl: metadata.sourceUrl,
    updatedLabel: metadata.updatedLabel,
    generatedAt: metadata.generatedAt,
    counts: countBySection(entries),
    entries,
    allEntries,
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
    if (!hasAnySelected(entry.genres, preferences.genres)) return false;
    if (preferences.organization !== "all" && !entry.organizations.includes(preferences.organization)) return false;
    if (preferences.section === "past" && preferences.ending !== "all" && entry.endingKind !== preferences.ending) {
      return false;
    }
    if (query === "") return true;
    return [
      entry.title,
      entry.seasonLabel,
      entry.timing,
      entry.endedReason ?? "",
      entry.organizationText,
      entry.genreText,
      entry.languages.join(" "),
      entry.countries.join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });

  return [...filtered].sort((left, right) => compareEntries(left, right, preferences.sort, preferences.sortDirection));
}

export function scheduleFilterOptions(entries: readonly ScheduleEntry[]) {
  return {
    languages: uniqueSorted(entries.flatMap((entry) => entry.languages)),
    countries: uniqueSorted(entries.flatMap((entry) => entry.countries)),
    genres: uniqueSorted(entries.flatMap((entry) => entry.genres)),
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

export function formatScheduleSeasonCount(
  entry: Pick<
    ScheduleEntry,
    "movieCount" | "officialSeasonCount" | "releaseKind" | "seasonLabel" | "seasonNumber" | "section" | "specialCount"
  >,
): string {
  if (entry.section === "current" || entry.section === "upcoming") {
    return entry.releaseKind === "season" && entry.seasonNumber != null
      ? String(entry.seasonNumber)
      : entry.seasonLabel;
  }
  const labels: string[] = [];
  if (entry.officialSeasonCount > 0 || (entry.movieCount === 0 && entry.specialCount === 0)) {
    labels.push(String(entry.officialSeasonCount));
  }
  if (entry.movieCount > 0) labels.push(`${entry.movieCount} ${entry.movieCount === 1 ? "movie" : "movies"}`);
  if (entry.specialCount > 0) {
    labels.push(`${entry.specialCount} ${entry.specialCount === 1 ? "special" : "specials"}`);
  }
  return labels.join(" + ");
}

export function formatScheduleStatus(section: ScheduleSection, endedReason: string | null, isFinal = false): string {
  if (section === "waiting" && isUnknownEndingReason(endedReason)) return sectionLabels.waiting;
  if (section === "past" && isFinal) {
    return endedReason == null || endedReason.toLowerCase() === "final season" ? sectionLabels.past : endedReason;
  }
  if (section === "waiting" || section === "past") return endedReason || "Unknown";
  return sectionLabels[section];
}

export function findImdbLink(links: readonly ExternalLinkSeed[]): ExternalLinkSeed | null {
  return (
    links.find((link) => link.kind?.toLocaleLowerCase() === "imdb") ??
    links.find((link) => /(^|\.)imdb\.com\/title\//i.test(link.url)) ??
    null
  );
}

export function findOrganizationLink(
  organization: string,
  links: readonly ExternalLinkSeed[],
  organizationCount: number,
): ExternalLinkSeed | null {
  const matching = links.find(
    (link) => isHttpLink(link.url) && link.label.trim().toLocaleLowerCase() === organization.toLocaleLowerCase(),
  );
  if (matching != null) return matching;
  if (organizationCount !== 1) return null;
  return links.find((link) => isHttpLink(link.url) && findImdbLink([link]) == null) ?? null;
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
        lifecycleStatus: entry.lifecycleStatus,
        endedReason: entry.endedReason,
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
      customSeasonLabel: entry.customSeasonLabel,
      seasonNumber: entry.seasonNumber,
      title: entry.releaseTitle,
      releaseKind: entry.releaseKind,
      isFinal: entry.isFinal,
      timing: entry.timing,
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
      episodeCount: entry.episodeCount,
      notes: entry.seasonNotes,
      links: entry.seasonLinks,
      episodes: entry.episodes,
    });

    shows.set(id, show);
  }

  return [...shows.values()]
    .map((show) => {
      const seasons = [...show.seasons].sort(compareManagementSeasons);
      return {
        ...show,
        listedSeasonCount: seasons.filter((season) => season.releaseKind === "season").length,
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
  const seasonLinks = mergeLinks(
    [],
    entry.organizations.flatMap((organization) => organization.externalLinks),
  );
  const genreText = entry.genreTags.join(", ") || entry.legacy.genreText;
  const endedReason = stopReasonFor(entry);
  const lifecycleStatus = lifecycleStatusForReason(endedReason);
  const seasonNumber = entry.season.number ?? seasonOrdinalFromRaw(entry.season.rawSeason);
  const releaseKind: ReleaseKind = entry.season.extraMovie ? "special" : seasonNumber == null ? "other" : "season";
  const languages = normalizeLanguages(entry.show.languages);
  const countries = entry.show.countries ?? [];
  return {
    id: entry.id,
    showId: showIdForTitle(entry.show.displayTitle),
    section: entry.section,
    sourceSection: entry.section,
    title: entry.show.displayTitle,
    originalTitle: null,
    seasonLabel: seasonLabel(entry),
    customSeasonLabel: null,
    seasonNumber: releaseKind === "season" ? seasonNumber : null,
    releaseTitle: null,
    releaseKind,
    isFinal: entry.season.lifecycleMarkers.includes("final_season"),
    officialSeasonCount: seasonNumber ?? 0,
    specialCount: releaseKind === "special" ? 1 : 0,
    movieCount: 0,
    timing: timingFor(entry),
    lifecycleStatus,
    endedReason,
    endingKind: endingKindFor(endedReason),
    organizationText: organizations.length > 0 ? organizations.join(", ") : entry.legacy.organizationText,
    organizations,
    genreText,
    genres: entry.genreTags,
    languages,
    countries,
    showLinks: entry.show.externalLinks,
    links: mergeLinks(entry.show.externalLinks, seasonLinks),
    seasonLinks,
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
  const seasonLinks = mergeLinks(
    season.externalLinks,
    season.organizations.flatMap((organization) => organization.externalLinks),
  );
  const genreText = show.genreTags.join(", ");
  const languages = normalizeLanguages(show.languages);
  const links = mergeLinks(show.externalLinks, seasonLinks);
  return {
    id: season.id,
    showId: show.id,
    section: season.section,
    sourceSection: season.section,
    title: show.displayTitle,
    originalTitle: show.originalTitle,
    seasonLabel: formatReleaseLabel(season),
    customSeasonLabel: season.seasonLabel,
    seasonNumber: season.seasonNumber,
    releaseTitle: season.title,
    releaseKind: season.releaseKind,
    isFinal: season.isFinal,
    officialSeasonCount: 0,
    specialCount: 0,
    movieCount: 0,
    timing: season.timing || formatRegistryTiming(season),
    lifecycleStatus: show.lifecycleStatus,
    endedReason: show.endedReason,
    endingKind: endingKindFor(show.endedReason),
    organizationText: organizations.join(", "),
    organizations,
    genreText,
    genres: show.genreTags,
    languages,
    countries: show.countries,
    showLinks: show.externalLinks,
    links,
    seasonLinks,
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

function withReleaseCounts(entries: readonly ScheduleEntry[]): ScheduleEntry[] {
  const counts = new Map<string, { movieCount: number; officialSeasonCount: number; specialCount: number }>();
  for (const entry of entries) {
    const current = counts.get(entry.showId) ?? { movieCount: 0, officialSeasonCount: 0, specialCount: 0 };
    if (entry.releaseKind === "season") current.officialSeasonCount += 1;
    if (entry.releaseKind === "movie") current.movieCount += 1;
    if (entry.releaseKind === "special") current.specialCount += 1;
    counts.set(entry.showId, current);
  }
  return entries.map((entry) => ({ ...entry, ...counts.get(entry.showId)! }));
}

function projectScheduleEntries(entries: readonly ScheduleEntry[]): ScheduleEntry[] {
  const byShow = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) byShow.set(entry.showId, [...(byShow.get(entry.showId) ?? []), entry]);

  const projected: ScheduleEntry[] = [];
  for (const showEntries of byShow.values()) {
    const activeOrFuture = showEntries.filter((entry) => entry.section === "current" || entry.section === "upcoming");
    if (activeOrFuture.length > 0) {
      projected.push(...activeOrFuture);
      continue;
    }
    const latest = [...showEntries].sort(compareReleaseRecency)[0];
    if (latest != null) {
      projected.push({ ...latest, section: completedSectionFor(latest.lifecycleStatus, latest.isFinal) });
    }
  }
  return projected.sort((left, right) => compareEntries(left, right, "when", "ascending"));
}

function compareReleaseRecency(left: ScheduleEntry, right: ScheduleEntry): number {
  return (
    compareNullableStringsDescending(left.sortKey, right.sortKey) ||
    (right.seasonNumber ?? -1) - (left.seasonNumber ?? -1) ||
    right.id.localeCompare(left.id)
  );
}

function compareNullableStringsDescending(left: string | null, right: string | null): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right.localeCompare(left);
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
const releaseSeasonEndMonths: Record<string, number> = {
  winter: 2,
  spring: 5,
  summer: 8,
  autumn: 11,
  fall: 11,
};
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

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
  if (entry.sourceSection === "upcoming" && entry.dateConfidence === "estimated") return entry;

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
    section = completedSectionFor(entry.lifecycleStatus, entry.isFinal);
  } else if (effectiveReleaseDay != null && effectiveReleaseDay.serial > asOf.serial) {
    section = "upcoming";
  } else if (effectiveReleaseDay != null) {
    section =
      entry.releasePattern === "bulk" && effectiveReleaseDay.serial + bulkCurrentGraceDays < asOf.serial
        ? completedSectionFor(entry.lifecycleStatus, entry.isFinal)
        : "current";
  } else if (entry.releasePattern === "bulk" && sourceSection === "current") {
    section =
      sourceReference.serial + bulkCurrentGraceDays < asOf.serial
        ? completedSectionFor(entry.lifecycleStatus, entry.isFinal)
        : "current";
  }

  const resolvedSortKey =
    entry.sortKey ??
    (effectiveReleaseDay == null
      ? null
      : dateKey(effectiveReleaseDay.year, effectiveReleaseDay.month, effectiveReleaseDay.day));
  const placedEntry =
    section === sourceSection && resolvedSortKey === entry.sortKey
      ? entry
      : { ...entry, section, sortKey: resolvedSortKey };
  return withCurrentTiming(placedEntry, effectiveReleaseDay);
}

function withCurrentTiming(entry: ScheduleEntry, releaseDay: CalendarDay | null): ScheduleEntry {
  if (entry.section !== "current") return entry;
  if (entry.releasePattern === "bulk") {
    return entry.timing === "Binge" ? entry : { ...entry, timing: "Binge" };
  }
  if (releaseDay == null) return entry;

  const weekday = weekdayNames[new Date(Date.UTC(releaseDay.year, releaseDay.month - 1, releaseDay.day)).getUTCDay()];
  const finale = formatWindow(entry.finaleWindow);
  const timing = [weekday, finale ? `finale ${finale}` : ""].filter(Boolean).join(" · ");
  return timing === entry.timing ? entry : { ...entry, timing };
}

function resolveWindowDay(
  window: ReleaseWindowSeed | null,
  sourceSection: SourceScheduleSection,
  sourceReference: CalendarDay,
  notBefore: CalendarDay | null = null,
): CalendarDay | null {
  if (window == null || windowReferenceMonth(window) == null) return null;
  if (window.year != null) return calendarDayForWindow(window, window.year);

  if (notBefore != null) {
    const sameYear = calendarDayForWindow(window, notBefore.year);
    return sameYear.serial < notBefore.serial ? calendarDayForWindow(window, notBefore.year + 1) : sameYear;
  }

  if (sourceSection === "upcoming") {
    const sameYear = calendarDayForWindow(window, sourceReference.year);
    return sameYear.serial < sourceReference.serial ? calendarDayForWindow(window, sourceReference.year + 1) : sameYear;
  }

  return nearestCalendarDayForWindow(sourceReference, window);
}

function completedSectionFor(
  lifecycleStatus: ShowLifecycleStatus,
  isFinal: boolean,
): Extract<ScheduleSection, "waiting" | "past"> {
  return lifecycleStatus === "open" && !isFinal ? "waiting" : "past";
}

function windowReferenceMonth(window: ReleaseWindowSeed): number | null {
  if (window.precision === "unknown") return null;
  if (window.month != null) return window.month;
  if (window.releaseSeason != null) return releaseSeasonEndMonths[window.releaseSeason.toLowerCase()] ?? null;
  return window.precision === "year" ? 12 : null;
}

function calendarDayForWindow(window: ReleaseWindowSeed, year: number): CalendarDay {
  const month = windowReferenceMonth(window);
  if (month == null) throw new Error(`Cannot create a calendar day for ${window.raw}`);
  const day = window.day ?? lastDayOfMonth(year, month);
  return calendarDay(year, month, day);
}

function nearestCalendarDayForWindow(reference: CalendarDay, window: ReleaseWindowSeed): CalendarDay {
  return [reference.year - 1, reference.year, reference.year + 1]
    .map((year) => calendarDayForWindow(window, year))
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

function compareEntries(
  left: ScheduleEntry,
  right: ScheduleEntry,
  sort: ScheduleSort,
  direction: ScheduleSortDirection,
): number {
  const primaryOrder = compareEntryField(left, right, sort, direction);
  return primaryOrder || left.title.localeCompare(right.title) || compareReleaseIdentity(left, right);
}

function compareEntryField(
  left: ScheduleEntry,
  right: ScheduleEntry,
  sort: ScheduleSort,
  direction: ScheduleSortDirection,
): number {
  if (sort === "when") {
    const exactBeforePeriod = compareContainedExactDates(left, right);
    return (
      exactBeforePeriod ||
      compareNullableStringsInDirection(scheduleSortKey(left), scheduleSortKey(right), direction) ||
      scheduleWindowPrecisionRank(left) - scheduleWindowPrecisionRank(right)
    );
  }
  if (sort === "seasons") {
    const numericOrder = compareNullableNumbersInDirection(
      scheduleSeasonSortNumber(left),
      scheduleSeasonSortNumber(right),
      direction,
    );
    return numericOrder || applySortDirection(left.seasonLabel.localeCompare(right.seasonLabel), direction);
  }

  const leftValue = scheduleTextSortValue(left, sort);
  const rightValue = scheduleTextSortValue(right, sort);
  return applySortDirection(leftValue.localeCompare(rightValue), direction);
}

function scheduleTextSortValue(entry: ScheduleEntry, sort: Exclude<ScheduleSort, "seasons" | "when">): string {
  if (sort === "title") return entry.title;
  if (sort === "ending") return formatScheduleStatus(entry.section, entry.endedReason, entry.isFinal);
  if (sort === "language") return entry.languages.join(", ");
  if (sort === "organization") return entry.organizationText;
  return entry.genreText;
}

function scheduleSeasonSortNumber(entry: ScheduleEntry): number | null {
  return entry.section === "current" || entry.section === "upcoming" ? entry.seasonNumber : entry.officialSeasonCount;
}

function applySortDirection(order: number, direction: ScheduleSortDirection): number {
  return direction === "descending" ? -order : order;
}

function compareNullableStringsInDirection(
  left: string | null,
  right: string | null,
  direction: ScheduleSortDirection,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return applySortDirection(left.localeCompare(right), direction);
}

function compareNullableNumbersInDirection(
  left: number | null,
  right: number | null,
  direction: ScheduleSortDirection,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return applySortDirection(left - right, direction);
}

function scheduleSortKey(entry: Pick<ScheduleEntry, "finaleWindow" | "releaseWindow" | "sortKey">): string | null {
  if (entry.sortKey != null) return entry.sortKey;
  const window = entry.releaseWindow ?? entry.finaleWindow;
  if (window?.year == null || windowReferenceMonth(window) == null) return null;
  const day = calendarDayForWindow(window, window.year);
  return dateKey(day.year, day.month, day.day);
}

function compareContainedExactDates(left: ScheduleEntry, right: ScheduleEntry): number {
  const leftWindow = scheduleOrderingWindow(left);
  const rightWindow = scheduleOrderingWindow(right);
  if (isExactWindow(leftWindow) && isBroadPeriodWindow(rightWindow) && periodContainsDate(rightWindow, leftWindow)) {
    return -1;
  }
  if (isExactWindow(rightWindow) && isBroadPeriodWindow(leftWindow) && periodContainsDate(leftWindow, rightWindow)) {
    return 1;
  }
  return 0;
}

function scheduleOrderingWindow(entry: ScheduleEntry): ReleaseWindowSeed | null {
  return entry.releaseWindow ?? entry.finaleWindow;
}

function isExactWindow(window: ReleaseWindowSeed | null): window is ReleaseWindowSeed & {
  day: number;
  month: number;
  year: number;
} {
  return window?.year != null && window.month != null && window.day != null;
}

function isBroadPeriodWindow(window: ReleaseWindowSeed | null): window is ReleaseWindowSeed & { year: number } {
  return window?.year != null && !isExactWindow(window) && windowReferenceMonth(window) != null;
}

function periodContainsDate(
  period: ReleaseWindowSeed & { year: number },
  exact: ReleaseWindowSeed & {
    day: number;
    month: number;
    year: number;
  },
): boolean {
  const [start, end] = periodBounds(period);
  const date = calendarDay(exact.year, exact.month, exact.day);
  return date.serial >= start.serial && date.serial <= end.serial;
}

function periodBounds(window: ReleaseWindowSeed & { year: number }): [CalendarDay, CalendarDay] {
  if (window.month != null) {
    return [calendarDay(window.year, window.month, 1), calendarDayForWindow(window, window.year)];
  }
  if (window.releaseSeason != null) {
    const season = window.releaseSeason.toLowerCase();
    if (season === "winter") {
      return [calendarDay(window.year - 1, 12, 1), calendarDayForWindow(window, window.year)];
    }
    const startMonth = season === "spring" ? 3 : season === "summer" ? 6 : 9;
    return [calendarDay(window.year, startMonth, 1), calendarDayForWindow(window, window.year)];
  }
  return [calendarDay(window.year, 1, 1), calendarDay(window.year, 12, 31)];
}

function scheduleWindowPrecisionRank(entry: ScheduleEntry): number {
  const precision = scheduleOrderingWindow(entry)?.precision ?? entry.releasePrecision;
  if (precision === "date" || precision === "day" || precision === "month_day") return 0;
  if (precision === "month") return 1;
  if (precision === "release_season" || precision === "season") return 2;
  if (precision === "year") return 3;
  return 4;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function compareReleaseIdentity(
  left: Pick<ScheduleEntry, "id" | "releaseKind" | "seasonNumber">,
  right: Pick<ScheduleEntry, "id" | "releaseKind" | "seasonNumber">,
): number {
  const numberOrder = (left.seasonNumber ?? Number.MAX_SAFE_INTEGER) - (right.seasonNumber ?? Number.MAX_SAFE_INTEGER);
  return numberOrder || left.releaseKind.localeCompare(right.releaseKind) || left.id.localeCompare(right.id);
}

function compareManagementSeasons(left: ManagementSeason, right: ManagementSeason): number {
  return (
    compareNullableStrings(scheduleSortKey(left), scheduleSortKey(right)) ||
    compareReleaseIdentity(left, right) ||
    left.seasonLabel.localeCompare(right.seasonLabel)
  );
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

function inferKnownSeasonCount(seasons: readonly Pick<ManagementSeason, "releaseKind" | "seasonNumber">[]): number {
  return seasons.reduce(
    (count, season) => (season.releaseKind === "season" ? Math.max(count, season.seasonNumber ?? 0) : count),
    0,
  );
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

function isHttpLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function endingKindFor(reason: string | null): Exclude<EndingFilter, "all"> {
  const normalized = reason?.toLocaleLowerCase() ?? "";
  if (normalized.startsWith("canceled") || normalized.startsWith("cancelled")) return "canceled";
  if (/^(?:finished|ended|completed|final season)/.test(normalized)) return "finished";
  return "unknown";
}

function isUnknownEndingReason(reason: string | null): boolean {
  const normalized = reason?.trim().toLocaleLowerCase() ?? "";
  return normalized === "" || normalized === "unknown";
}

function seasonLabel(entry: BlogspotEntrySeed): string {
  const ordinal = entry.season.number ?? seasonOrdinalFromRaw(entry.season.rawSeason);
  const prefix = entry.season.extraMovie
    ? "Special"
    : ordinal == null
      ? entry.season.rawSeason || "Release"
      : `S${ordinal}`;
  return entry.season.tentative ? `${prefix}?` : prefix;
}

export function formatReleaseLabel(
  release: Pick<CanonicalSeasonSeedRow, "releaseKind" | "seasonLabel" | "seasonNumber" | "title">,
): string {
  if (release.seasonLabel?.trim()) return release.seasonLabel.trim();
  if (release.title?.trim()) return release.title.trim();
  if (release.releaseKind === "season" && release.seasonNumber != null) return `S${release.seasonNumber}`;
  return release.releaseKind.charAt(0).toLocaleUpperCase() + release.releaseKind.slice(1);
}

function lifecycleStatusForReason(reason: string): ShowLifecycleStatus {
  const normalized = reason.trim().toLocaleLowerCase();
  if (normalized.startsWith("canceled") || normalized.startsWith("cancelled")) return "cancelled";
  if (/^(?:finished|ended|completed|final season)/.test(normalized)) return "ended";
  return "open";
}

function seasonOrdinalFromRaw(value: string): number | null {
  const match = /^(\d+)/.exec(value.trim());
  if (match?.[1] == null) return null;
  const ordinal = Number(match[1]);
  return Number.isInteger(ordinal) && ordinal > 0 ? ordinal : null;
}

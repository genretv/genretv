export type ScheduleSection = "current" | "upcoming" | "past";
export type EndingFilter = "all" | "canceled" | "finished" | "unknown";
export type ScheduleSort = "source" | "title" | "organization";

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

export interface ScheduleEntry {
  id: string;
  sourceRow: number;
  section: ScheduleSection;
  title: string;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  endingKind: Exclude<EndingFilter, "all">;
  organizationText: string;
  organizations: string[];
  genreText: string;
  genres: string[];
  languages: string[];
  links: ExternalLinkSeed[];
  legacyCells: string[];
}

export interface ManagementSeason {
  id: string;
  section: ScheduleSection;
  seasonLabel: string;
  timing: string;
  endedReason: string;
  organizationText: string;
  genreText: string;
  sourceRow: number;
}

export interface ManagementShow {
  id: string;
  title: string;
  languages: string[];
  organizations: string[];
  genres: string[];
  links: ExternalLinkSeed[];
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
  language: string;
  organization: string;
  ending: EndingFilter;
  sort: ScheduleSort;
}

export const defaultScheduleViewPreferences: ScheduleViewPreferences = {
  section: "current",
  query: "",
  language: "all",
  organization: "all",
  ending: "all",
  sort: "source",
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

export function filterScheduleEntries(
  entries: readonly ScheduleEntry[],
  preferences: ScheduleViewPreferences,
): ScheduleEntry[] {
  const query = preferences.query.trim().toLocaleLowerCase();
  const filtered = entries.filter((entry) => {
    if (entry.section !== preferences.section) return false;
    if (preferences.language !== "all" && !entry.languages.includes(preferences.language)) return false;
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
    organizations: uniqueSorted(entries.flatMap((entry) => entry.organizations)),
  };
}

export function buildManagementShows(entries: readonly ScheduleEntry[]): ManagementShow[] {
  const shows = new Map<string, ManagementShow>();
  for (const entry of entries) {
    const id = showIdForTitle(entry.title);
    const existing = shows.get(id);
    const show =
      existing ??
      ({
        id,
        title: entry.title,
        languages: [],
        organizations: [],
        genres: [],
        links: [],
        seasons: [],
      } satisfies ManagementShow);

    show.languages = uniqueSorted([...show.languages, ...entry.languages]);
    show.organizations = uniqueSorted([...show.organizations, ...entry.organizations]);
    show.genres = uniqueSorted([...show.genres, ...entry.genres]);
    show.links = mergeLinks(show.links, entry.links);
    show.seasons.push({
      id: entry.id,
      section: entry.section,
      seasonLabel: entry.seasonLabel,
      timing: entry.timing,
      endedReason: entry.endedReason,
      organizationText: entry.organizationText,
      genreText: entry.genreText,
      sourceRow: entry.sourceRow,
    });

    shows.set(id, show);
  }

  return [...shows.values()]
    .map((show) => ({
      ...show,
      seasons: [...show.seasons].sort((left, right) => left.sourceRow - right.sourceRow),
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

export function filterManagementShows(
  shows: readonly ManagementShow[],
  query: string,
  organization: string,
  language: string,
): ManagementShow[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return shows.filter((show) => {
    if (organization !== "all" && !show.organizations.includes(organization)) return false;
    if (language !== "all" && !show.languages.includes(language)) return false;
    if (normalizedQuery === "") return true;
    return [show.title, show.organizations.join(" "), show.genres.join(" "), show.languages.join(" ")]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export function findManagementShow(shows: readonly ManagementShow[], showId: string): ManagementShow | null {
  return shows.find((show) => show.id === showId) ?? null;
}

function toScheduleEntry(entry: BlogspotEntrySeed): ScheduleEntry {
  const organizations = entry.organizations.map((organization) => organization.name).filter(Boolean);
  const genreText = entry.genreTags.join(", ") || entry.legacy.genreText;
  const endedReason = stopReasonFor(entry);
  return {
    id: entry.id,
    sourceRow: entry.sourceRow,
    section: entry.section,
    title: entry.show.displayTitle,
    seasonLabel: seasonLabel(entry),
    timing: timingFor(entry),
    endedReason,
    endingKind: endingKindFor(endedReason),
    organizationText: organizations.length > 0 ? organizations.join(", ") : entry.legacy.organizationText,
    organizations,
    genreText,
    genres: entry.genreTags,
    languages: entry.show.languages,
    links: entry.show.externalLinks,
    legacyCells: entry.legacy.cells,
  };
}

function compareEntries(left: ScheduleEntry, right: ScheduleEntry, sort: ScheduleSort): number {
  if (sort === "title") return left.title.localeCompare(right.title);
  if (sort === "organization") {
    return left.organizationText.localeCompare(right.organizationText) || left.sourceRow - right.sourceRow;
  }
  return left.sourceRow - right.sourceRow;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value !== ""))].sort((left, right) => left.localeCompare(right));
}

function mergeLinks(left: readonly ExternalLinkSeed[], right: readonly ExternalLinkSeed[]): ExternalLinkSeed[] {
  const byUrl = new Map<string, ExternalLinkSeed>();
  for (const link of [...left, ...right]) {
    byUrl.set(link.url, link);
  }
  return [...byUrl.values()];
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

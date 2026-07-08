import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

type SectionKind = "current" | "upcoming" | "past";
type ReleasePrecision = "date" | "month_day" | "month" | "release_season" | "year" | "unknown";
type DateConfidence = "confirmed" | "estimated";

interface ParsedLink {
  label: string;
  url: string;
}

interface ReleaseWindowSeed {
  raw: string;
  precision: ReleasePrecision;
  confidence: DateConfidence;
  year: number | null;
  month: number | null;
  day: number | null;
  releaseSeason: "winter" | "spring" | "summer" | "autumn" | null;
}

interface CanonicalSeedEntry {
  id: string;
  section: SectionKind;
  sourceRow: number;
  show: {
    displayTitle: string;
    externalLinks: Array<{ kind: "imdb" | "official" | "other"; label: string; url: string }>;
    languages: string[];
  };
  season: {
    rawSeason: string;
    labelKind: "numbered" | "pilot" | "movie" | "unknown";
    number: number | null;
    tentative: boolean;
    extraMovie: boolean;
    hiatus: boolean;
    releasePattern: "weekly" | "bulk" | "unknown";
    releaseWindow: ReleaseWindowSeed | null;
    finaleWindow: ReleaseWindowSeed | null;
    lifecycleMarkers: Array<{ raw: string; meaning: string }>;
    legacyStatus: string;
    legacyTiming: string;
  };
  organizations: Array<{ name: string; role: "streamer"; externalLinks: ParsedLink[] }>;
  genreTags: string[];
  notes: string[];
  legacy: {
    genreText: string;
    organizationText: string;
    detailText: string;
    cells: string[];
  };
}

interface CanonicalSeed {
  schemaVersion: 1;
  generatedAt: string;
  source: {
    url: string;
    fetchedFrom: string;
    pageTitle: string;
    updatedLabel: string | null;
  };
  summary: {
    totalEntries: number;
    bySection: Record<SectionKind, number>;
    parserWarnings: string[];
  };
  legacyLegend: {
    lifecycleMarkers: Record<string, string>;
    languageMarkers: Record<string, string>;
  };
  entries: CanonicalSeedEntry[];
}

const SOURCE_URL = "https://genretv.blogspot.com/";

const LIFECYCLE_MARKERS: Record<string, string> = {
  r: "renewed",
  c: "cancelled",
  f: "final_season",
  rf: "renewed_for_final_season",
  m: "moving_to_new_channel",
};

const LANGUAGE_MARKERS: Record<string, string> = {
  ar: "ar",
  ch: "zh",
  dn: "da",
  du: "nl",
  fr: "fr",
  hi: "hi",
  it: "it",
  jp: "ja",
  kr: "ko",
  nr: "no",
  pl: "pl",
  pr: "pt",
  ru: "ru",
  sp: "es",
  sw: "sv",
  ti: "th",
  tk: "tr",
  zu: "zu",
};

const MONTHS: Record<string, number> = {
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

const RELEASE_SEASONS: Record<string, ReleaseWindowSeed["releaseSeason"]> = {
  winter: "winter",
  spring: "spring",
  summer: "summer",
  fall: "autumn",
  autumn: "autumn",
};

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(cellHtml: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  for (const match of cellHtml.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    links.push({ url: decodeHtml(match[2] ?? "").trim(), label: stripTags(match[3] ?? "") });
  }
  return links;
}

function extractCells(rowHtml: string): Array<{ html: string; text: string; links: ParsedLink[] }> {
  const cells = [];
  for (const match of rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)) {
    const html = match[1] ?? "";
    cells.push({ html, text: stripTags(html), links: extractLinks(html) });
  }
  return cells;
}

function extractRows(tableHtml: string): string[] {
  const starts = Array.from(tableHtml.matchAll(/<tr\b[^>]*>/gi), (match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  const rows: string[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    const current = starts[index];
    if (current == null) continue;
    const next = starts[index + 1];
    const raw = tableHtml.slice(current.end, next?.start ?? tableHtml.length).replace(/<\/tr>\s*$/i, "");
    rows.push(raw);
  }
  return rows;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

function normalizeImdbUrl(url: string): string | null {
  const match = url.match(/imdb\.com\/title\/(tt\d+)/i);
  return match ? `https://www.imdb.com/title/${match[1]}/` : null;
}

function classifySection(headerText: string): SectionKind | null {
  const lower = headerText.toLowerCase();
  if (lower.includes("on now")) return "current";
  if (lower.includes("upcoming")) return "upcoming";
  if (lower.includes("past shows")) return "past";
  return null;
}

function parseReleaseWindow(rawValue: string): ReleaseWindowSeed | null {
  const raw = rawValue.trim();
  if (!raw || raw === "?" || raw.toLowerCase() === "binge") return null;

  const confidence: DateConfidence = raw.includes("?") ? "estimated" : "confirmed";
  const normalized = raw
    .replace(/\([^)]*\)/g, "")
    .replace(/\?/g, "")
    .replace(/,/g, "")
    .trim();
  if (!normalized) return null;

  const yearOnly = normalized.match(/^(\d{4})$/);
  if (yearOnly) {
    return {
      raw,
      precision: "year",
      confidence,
      year: Number(yearOnly[1]),
      month: null,
      day: null,
      releaseSeason: null,
    };
  }

  const season = RELEASE_SEASONS[normalized.toLowerCase()];
  if (season != null) {
    return {
      raw,
      precision: "release_season",
      confidence,
      year: null,
      month: null,
      day: null,
      releaseSeason: season,
    };
  }

  const monthMatch = normalized.match(/^([A-Za-z]+)\.?\s*(?:(\d{1,2}))?\s*(?:(\d{4}))?$/);
  if (monthMatch) {
    const month = MONTHS[(monthMatch[1] ?? "").toLowerCase()];
    if (month != null) {
      const day = monthMatch[2] ? Number(monthMatch[2]) : null;
      const year = monthMatch[3] ? Number(monthMatch[3]) : null;
      return {
        raw,
        precision: year != null && day != null ? "date" : day != null ? "month_day" : "month",
        confidence,
        year,
        month,
        day,
        releaseSeason: null,
      };
    }
  }

  return {
    raw,
    precision: "unknown",
    confidence,
    year: null,
    month: null,
    day: null,
    releaseSeason: null,
  };
}

function parseSeason(
  rawSeason: string,
): Pick<CanonicalSeedEntry["season"], "rawSeason" | "labelKind" | "number" | "tentative" | "extraMovie" | "hiatus"> {
  const raw = rawSeason.trim();
  const numberMatch = raw.match(/\d+/);
  const number = numberMatch ? Number(numberMatch[0]) : null;
  const extraMovie = /x/i.test(raw);
  const hiatus = /h/i.test(raw);
  const tentative = raw.includes("?");
  const labelKind = raw === "0" ? "pilot" : number != null ? "numbered" : extraMovie ? "movie" : "unknown";
  return { rawSeason: raw, labelKind, number, tentative, extraMovie, hiatus };
}

function parseMarkers(...values: string[]): Array<{ raw: string; meaning: string }> {
  const markers = new Map<string, string>();
  for (const value of values) {
    for (const group of value.matchAll(/\(([^)]*)\)/g)) {
      const rawGroup = (group[1] ?? "").trim();
      for (const token of rawGroup.split(/\s+/)) {
        const normalized = token.toLowerCase().replace(/[^a-z]/g, "");
        if (!normalized) continue;
        markers.set(token, LIFECYCLE_MARKERS[normalized] ?? `legacy_${token}`);
      }
    }
  }
  return Array.from(markers, ([raw, meaning]) => ({ raw, meaning }));
}

function parseGenre(rawGenre: string): { genreTags: string[]; languages: string[] } {
  const languages = new Set<string>();
  for (const match of rawGenre.matchAll(/\(([a-z]{2})\)/gi)) {
    const legacy = match[1]?.toLowerCase();
    const iso = legacy ? LANGUAGE_MARKERS[legacy] : undefined;
    if (iso != null) languages.add(iso);
  }
  const cleanGenre = rawGenre.replace(/\([a-z]{2}\)/gi, "").trim();
  const genreTags = cleanGenre ? [cleanGenre] : [];
  return { genreTags, languages: Array.from(languages) };
}

function parseOrganization(cellText: string, links: ParsedLink[]): CanonicalSeedEntry["organizations"] {
  const text = cellText.trim();
  if (!text || text === "?") return [];
  const names = text.split(/\s*\/\s*/).filter(Boolean);
  return names.map((name) => {
    const matchingLinks = links.filter((link) => link.label === name || names.length === 1);
    return { name, role: "streamer", externalLinks: matchingLinks };
  });
}

function parseEntry(
  section: SectionKind,
  rowHtml: string,
  sourceRow: number,
  warnings: string[],
): CanonicalSeedEntry | null {
  const cells = extractCells(rowHtml);
  if (cells.length < 6) return null;
  if (cells.some((cell) => /<strong>/i.test(cell.html))) return null;

  const [titleCell, timingCell, organizationCell, genreCell, seasonCell, detailCell] = cells;
  if (
    titleCell == null ||
    timingCell == null ||
    organizationCell == null ||
    genreCell == null ||
    seasonCell == null ||
    detailCell == null
  ) {
    return null;
  }
  if (!titleCell.text) return null;

  const titleLink = titleCell.links[0];
  const imdbUrl = titleLink ? normalizeImdbUrl(titleLink.url) : null;
  const displayTitle = titleCell.text;
  const { genreTags, languages } = parseGenre(genreCell.text);
  const parsedSeason = parseSeason(seasonCell.text);
  const releasePattern =
    timingCell.text.toLowerCase() === "binge" ? "bulk" : section === "current" ? "weekly" : "unknown";
  const lifecycleMarkers = parseMarkers(detailCell.text, seasonCell.text);
  const externalLinks: CanonicalSeedEntry["show"]["externalLinks"] = [];
  if (titleLink != null) {
    externalLinks.push({ kind: imdbUrl ? "imdb" : "other", label: titleLink.label, url: imdbUrl ?? titleLink.url });
  }

  const organizationLinks = organizationCell.links.map((link) => ({
    ...link,
    url: normalizeImdbUrl(link.url) ?? link.url,
  }));
  const organizations = parseOrganization(organizationCell.text, organizationLinks);

  if (cells.length !== 6) warnings.push(`Row ${sourceRow} parsed with ${cells.length} cells: ${displayTitle}`);

  const releaseWindow = section === "upcoming" ? parseReleaseWindow(timingCell.text) : null;
  const finaleWindow =
    section === "past" || section === "upcoming"
      ? parseReleaseWindow(detailCell.text)
      : parseReleaseWindow(detailCell.text);

  return {
    id: `${section}-${sourceRow}-${slugify(displayTitle)}`,
    section,
    sourceRow,
    show: {
      displayTitle,
      externalLinks,
      languages,
    },
    season: {
      ...parsedSeason,
      releasePattern,
      releaseWindow,
      finaleWindow,
      lifecycleMarkers,
      legacyStatus: section === "past" ? timingCell.text : "",
      legacyTiming: timingCell.text,
    },
    organizations,
    genreTags,
    notes: [],
    legacy: {
      genreText: genreCell.text,
      organizationText: organizationCell.text,
      detailText: detailCell.text,
      cells: cells.map((cell) => cell.text),
    },
  };
}

function parseSeed(html: string, sourceLabel: string): CanonicalSeed {
  const warnings: string[] = [];
  const pageTitle = stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "genretv");
  const updatedLabel = stripTags(html.match(/<strong>\s*(Updated[^<]+)<\/strong>/i)?.[1] ?? "") || null;
  const entries: CanonicalSeedEntry[] = [];
  let section: SectionKind | null = null;
  let rowIndex = 0;

  for (const tableMatch of html.matchAll(/<table\b[^>]*>\s*<tbody>([\s\S]*?)<\/tbody>\s*<\/table>/gi)) {
    const tableHtml = tableMatch[1] ?? "";
    const rows = extractRows(tableHtml);
    const firstCell = extractCells(rows[0] ?? "")[0]?.text ?? "";
    section = classifySection(firstCell);
    if (section == null) {
      warnings.push(`Skipped table with unrecognized header: ${firstCell}`);
      continue;
    }

    for (const rowHtml of rows) {
      rowIndex += 1;
      const entry = parseEntry(section, rowHtml, rowIndex, warnings);
      if (entry != null) entries.push(entry);
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      url: SOURCE_URL,
      fetchedFrom: sourceLabel,
      pageTitle,
      updatedLabel,
    },
    summary: {
      totalEntries: entries.length,
      bySection: {
        current: entries.filter((entry) => entry.section === "current").length,
        upcoming: entries.filter((entry) => entry.section === "upcoming").length,
        past: entries.filter((entry) => entry.section === "past").length,
      },
      parserWarnings: warnings,
    },
    legacyLegend: {
      lifecycleMarkers: LIFECYCLE_MARKERS,
      languageMarkers: LANGUAGE_MARKERS,
    },
    entries,
  };
}

function getArgValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function loadHtml(): Promise<{ html: string; sourceLabel: string }> {
  const input = getArgValue("--input");
  if (input != null) {
    const path = resolve(input);
    return { html: await readFile(path, "utf8"), sourceLabel: basename(path) };
  }

  const url = getArgValue("--url") ?? SOURCE_URL;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  return { html: await response.text(), sourceLabel: url };
}

async function main() {
  const out = getArgValue("--out") ?? "apps/genretv/seeds/blogspot-canonical.seed.json";
  const { html, sourceLabel } = await loadHtml();
  const seed = parseSeed(html, sourceLabel);
  const outPath = resolve(out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(seed, null, 2)}\n`);
  console.log(`Wrote ${seed.summary.totalEntries} entries to ${out}`);
  console.log(
    `Sections: current=${seed.summary.bySection.current}, upcoming=${seed.summary.bySection.upcoming}, past=${seed.summary.bySection.past}`,
  );
  if (seed.summary.parserWarnings.length > 0) {
    console.log(`Warnings: ${seed.summary.parserWarnings.length}`);
    for (const warning of seed.summary.parserWarnings.slice(0, 10)) console.log(`- ${warning}`);
  }
}

await main();

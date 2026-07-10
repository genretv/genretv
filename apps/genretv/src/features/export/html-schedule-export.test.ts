import { describe, expect, test } from "bun:test";

import type { CanonicalSchedule, ScheduleEntry, ScheduleSection } from "../../domain/schedule";
import { buildHtmlScheduleExport } from "./html-schedule-export";

describe("HTML schedule export", () => {
  test("builds one unstyled original-style fragment containing every section", () => {
    const html = buildHtmlScheduleExport(
      schedule([
        entry({
          id: "current",
          section: "current",
          title: "A & B",
          timing: "Binge",
          organizations: ["Netflix"],
          organizationText: "Netflix",
          seasonLinks: [{ label: "Netflix", url: "https://www.netflix.com/title/1" }],
          showLinks: [{ kind: "imdb", label: "IMDb", url: "http://www.imdb.com/title/tt1/" }],
        }),
        entry({
          id: "upcoming",
          section: "upcoming",
          sourceSection: "upcoming",
          title: "<Future Show>",
          seasonNumber: 3,
          seasonLabel: "S3",
          isFinal: true,
          timing: "Autumn 2027",
          languages: ["da", "sv", "en"],
          genreText: "Crime Fantasy",
          finaleWindow: releaseWindow("Nov.30 (f)", 2027, 11, 30),
          showLinks: [{ kind: "other", label: "Unsafe", url: "javascript:alert(1)" }],
        }),
        entry({
          id: "waiting",
          section: "waiting",
          title: "Waiting Show",
          officialSeasonCount: 2,
          finaleWindow: releaseWindow("Jun.21, 2026", 2026, 6, 21),
        }),
        entry({
          id: "past",
          section: "past",
          sourceSection: "past",
          title: "Past Show",
          lifecycleStatus: "ended",
          endedReason: "Finished",
          endingKind: "finished",
          officialSeasonCount: 4,
          finaleWindow: releaseWindow("May 4, 2025", 2025, 5, 4),
          episodes: [
            {
              id: "secret-episode",
              episodeLabel: "E1",
              title: "Must not be exported",
              releaseDate: "May 4",
              releaseWindow: null,
              sortKey: null,
              notes: null,
              links: [],
            },
          ],
        }),
      ]),
    );

    expect(html.startsWith("<div>\n<table>")).toBe(true);
    expect(html.endsWith("\n</div>")).toBe(true);
    expect(html).not.toContain("<html");
    expect(html).not.toContain("<section");
    expect(html).not.toContain(" style=");
    expect(html).not.toContain(" class=");
    expect(html).not.toContain("Must not be exported");
    expect(html).not.toContain("javascript:");

    expect(html).toContain("<th>On Now</th><th>Day</th><th>Official Page</th><th>Genre</th><th>S</th><th>Finale</th>");
    expect(html).toContain(
      '<a href="http://www.imdb.com/title/tt1/" target="_blank" rel="noopener noreferrer">A &amp; B</a>',
    );
    expect(html).toContain(
      '<a href="https://www.netflix.com/title/1" target="_blank" rel="noopener noreferrer">Netflix</a>',
    );
    expect(html).toContain("Crime Fantasy (da, sv, en)");
    expect(html).toContain("<td>3</td><td>Nov.30 (f)</td>");
    expect(html).toContain("Awaiting renewal or cancellation");
    expect(html).toContain("<td>Finished</td>");

    const onNow = html.indexOf("<th>On Now</th>");
    const upcoming = html.indexOf("<th>Upcoming</th>");
    const waiting = html.indexOf("<th>Awaiting Renewal or Cancellation</th>");
    const past = html.indexOf("<th>Past Shows</th>");
    expect(onNow).toBeLessThan(upcoming);
    expect(upcoming).toBeLessThan(waiting);
    expect(waiting).toBeLessThan(past);
  });
});

function schedule(entries: ScheduleEntry[]): CanonicalSchedule {
  return {
    title: "GenreTV",
    sourceUrl: "https://example.test",
    updatedLabel: "Updated today",
    generatedAt: "2026-07-10T00:00:00.000Z",
    entries,
    allEntries: entries,
    counts: {
      current: entries.filter((row) => row.section === "current").length,
      upcoming: entries.filter((row) => row.section === "upcoming").length,
      waiting: entries.filter((row) => row.section === "waiting").length,
      past: entries.filter((row) => row.section === "past").length,
    },
  };
}

function entry(overrides: Partial<ScheduleEntry> & Pick<ScheduleEntry, "id" | "section" | "title">): ScheduleEntry {
  const { id, section, title, ...rest } = overrides;
  return {
    id,
    showId: `show-${id}`,
    section,
    sourceSection: sourceSection(section),
    title,
    originalTitle: null,
    seasonLabel: "S1",
    customSeasonLabel: null,
    seasonNumber: 1,
    releaseTitle: null,
    releaseKind: "season",
    isFinal: false,
    officialSeasonCount: 1,
    specialCount: 0,
    movieCount: 0,
    timing: "Sunday",
    lifecycleStatus: "open",
    endedReason: null,
    endingKind: "unknown",
    organizationText: "Apple",
    organizations: ["Apple"],
    genreText: "Fantasy",
    genres: ["Fantasy"],
    languages: ["en"],
    countries: [],
    showLinks: [],
    links: [],
    seasonLinks: [],
    notes: null,
    seasonNotes: null,
    releasePattern: "weekly",
    releasePrecision: "day",
    dateConfidence: "confirmed",
    releaseWindow: null,
    finaleWindow: null,
    sortKey: null,
    legacyCells: [],
    episodeCount: null,
    episodes: [],
    ...rest,
  };
}

function sourceSection(section: ScheduleSection): ScheduleEntry["sourceSection"] {
  return section === "waiting" ? "current" : section;
}

function releaseWindow(raw: string, year: number, month: number, day: number) {
  return {
    raw,
    precision: "date",
    confidence: "confirmed",
    year,
    month,
    day,
    releaseSeason: null,
  };
}

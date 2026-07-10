import { describe, expect, test } from "bun:test";

import {
  buildManagementShows,
  buildScheduleFromRegistryRows,
  buildScheduleFromRegistrySeed,
  defaultManagementViewPreferences,
  defaultScheduleViewPreferences,
  filterManagementShows,
  findManagementShow,
  findManagementSeason,
  filterScheduleEntries,
  formatEpisodeCount,
  formatKnownSeasonCount,
  formatScheduleSeasonCount,
  formatScheduleStatus,
  pageCountFor,
  paginateItems,
  scheduleFilterOptions,
  type CanonicalRegistrySeed,
} from "./schedule";

const seed: CanonicalRegistrySeed = {
  schemaVersion: 1,
  generatedAt: "2026-07-07T00:00:00.000Z",
  source: {
    pageTitle: "GenreTV test",
    updatedLabel: "Updated today",
    url: "https://example.test",
  },
  summary: {
    shows: 3,
    seasons: 3,
    episodes: 0,
  },
  rows: {
    shows: [
      {
        id: "show-a",
        displayTitle: "A Show",
        originalTitle: null,
        languages: ["da"],
        countries: [],
        genreTags: ["Fantasy"],
        externalLinks: [],
        notes: null,
      },
      {
        id: "show-b",
        displayTitle: "B Show",
        originalTitle: null,
        languages: [],
        countries: [],
        genreTags: ["Sci-Fi"],
        externalLinks: [],
        notes: null,
      },
      {
        id: "show-c",
        displayTitle: "C Show",
        originalTitle: null,
        languages: ["en", "da"],
        countries: [],
        genreTags: ["Supernatural"],
        externalLinks: [],
        notes: null,
      },
    ],
    seasons: [
      {
        id: "current-a",
        showId: "show-a",
        section: "current",
        seasonLabel: "S2",
        timing: "Friday",
        endedReason: "Unknown",
        releasePattern: "weekly",
        releasePrecision: "unknown",
        dateConfidence: "unknown",
        releaseWindow: null,
        finaleWindow: null,
        sortKey: null,
        episodeCount: null,
        sourceRow: 3,
        organizations: [{ name: "Apple", role: "streamer", externalLinks: [] }],
        externalLinks: [],
        notes: null,
      },
      {
        id: "upcoming-b",
        showId: "show-b",
        section: "upcoming",
        seasonLabel: "S1?",
        timing: "Spring",
        endedReason: "Unknown",
        releasePattern: "weekly",
        releasePrecision: "season",
        dateConfidence: "expected",
        releaseWindow: {
          raw: "Spring",
          precision: "season",
          confidence: "expected",
          year: 2027,
          month: null,
          day: null,
          releaseSeason: "spring",
        },
        finaleWindow: null,
        sortKey: null,
        episodeCount: 2,
        sourceRow: 2,
        organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
        externalLinks: [],
        notes: null,
      },
      {
        id: "past-c",
        showId: "show-c",
        section: "past",
        seasonLabel: "S6",
        timing: "2024",
        endedReason: "Canceled",
        releasePattern: "weekly",
        releasePrecision: "unknown",
        dateConfidence: "unknown",
        releaseWindow: null,
        finaleWindow: null,
        sortKey: null,
        episodeCount: null,
        sourceRow: 1,
        organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
        externalLinks: [],
        notes: null,
      },
    ],
    episodes: [
      {
        id: "episode-b-2",
        seasonId: "upcoming-b",
        episodeLabel: "E2",
        title: "Second Landing",
        releaseWindow: null,
        sortKey: "002",
        externalLinks: [],
        notes: null,
      },
      {
        id: "episode-b-1",
        seasonId: "upcoming-b",
        episodeLabel: "E1",
        title: "Pilot",
        releaseWindow: {
          raw: "Mar.1",
          precision: "month_day",
          confidence: "confirmed",
          year: null,
          month: 3,
          day: 1,
          releaseSeason: null,
        },
        sortKey: "001",
        externalLinks: [],
        notes: "First episode",
      },
    ],
  },
};

describe("schedule read model", () => {
  test("builds display entries from the canonical registry seed", () => {
    const schedule = buildTestSchedule();
    expect(schedule.entries[0]?.title).toBe("A Show");
    expect(schedule.entries[0]?.originalTitle).toBeNull();
    expect(schedule.entries[0]?.seasonLabel).toBe("S2");
    expect(schedule.entries[1]?.languages).toEqual(["en"]);
    expect(schedule.entries[1]?.episodeCount).toBe(2);
    expect(schedule.entries[1]?.episodes.map((episode) => episode.episodeLabel)).toEqual(["E1", "E2"]);
    expect(schedule.entries[1]?.episodes[0]).toMatchObject({
      releaseDate: "Mar.1",
      notes: "First episode",
    });
    expect(schedule.entries[2]?.endedReason).toBe("Canceled");
    expect(schedule.entries[2]?.endingKind).toBe("canceled");
  });

  test("builds display entries from canonical registry rows", () => {
    const schedule = buildScheduleFromRegistryRows(
      seed.rows,
      {
        title: "Live GenreTV",
        sourceUrl: "https://live.example.test",
        updatedLabel: "Live",
        generatedAt: "2026-07-08T00:00:00.000Z",
      },
      { asOf: "2026-07-10" },
    );
    expect(schedule.title).toBe("Live GenreTV");
    expect(schedule.sourceUrl).toBe("https://live.example.test");
    expect(schedule.counts).toEqual({ current: 1, upcoming: 1, waiting: 0, past: 1 });
    expect(schedule.entries[1]?.episodes.map((episode) => episode.title)).toEqual(["Pilot", "Second Landing"]);
  });

  test("derives schedule placement from release dates at the current date", () => {
    const baseSeason = seed.rows.seasons[0]!;
    const rows: CanonicalRegistrySeed["rows"] = {
      shows: [{ ...seed.rows.shows[0]!, id: "dynamic-show" }],
      seasons: [
        {
          ...baseSeason,
          id: "waiting-weekly",
          showId: "dynamic-show",
          section: "current",
          finaleWindow: releaseWindow("Jun.28", 6, 28),
        },
        {
          ...baseSeason,
          id: "finished-final-season",
          showId: "dynamic-show",
          section: "current",
          endedReason: "Final season",
          finaleWindow: releaseWindow("Jun.28", 6, 28),
        },
        {
          ...baseSeason,
          id: "started-upcoming",
          showId: "dynamic-show",
          section: "upcoming",
          releaseWindow: releaseWindow("Jun.21", 6, 21),
          finaleWindow: releaseWindow("Aug.9", 8, 9),
        },
        {
          ...baseSeason,
          id: "future-upcoming",
          showId: "dynamic-show",
          section: "upcoming",
          releaseWindow: releaseWindow("Jul.23", 7, 23),
          finaleWindow: null,
        },
        {
          ...baseSeason,
          id: "recent-bulk",
          showId: "dynamic-show",
          section: "current",
          releasePattern: "bulk",
          releaseWindow: null,
          finaleWindow: null,
        },
      ],
      episodes: [],
    };

    const schedule = buildScheduleFromRegistryRows(
      rows,
      {
        title: "Dynamic GenreTV",
        sourceUrl: "https://example.test",
        updatedLabel: "Updated Jun.17, 2026:",
        generatedAt: "2026-07-07T00:00:00.000Z",
      },
      { asOf: "2026-07-10" },
    );

    expect(schedule.entries.map(({ id, section }) => ({ id, section }))).toEqual([
      { id: "waiting-weekly", section: "waiting" },
      { id: "finished-final-season", section: "past" },
      { id: "started-upcoming", section: "current" },
      { id: "future-upcoming", section: "upcoming" },
      { id: "recent-bulk", section: "current" },
    ]);
    expect(schedule.entries[0]?.endedReason).toBe("Unknown");
    expect(formatScheduleStatus(schedule.entries[0]!.section, schedule.entries[0]!.endedReason)).toBe(
      "Awaiting Renewal or Cancellation",
    );
    expect(schedule.counts).toEqual({ current: 2, upcoming: 1, waiting: 1, past: 1 });
    expect(buildManagementShows(schedule.entries)[0]?.seasons[0]).toMatchObject({
      scheduleSection: "waiting",
      section: "current",
    });
  });

  test("expires date-less bulk releases after the five-week current grace period", () => {
    const schedule = buildScheduleFromRegistryRows(
      {
        shows: [{ ...seed.rows.shows[0]!, id: "bulk-show" }],
        seasons: [
          {
            ...seed.rows.seasons[0]!,
            id: "bulk-season",
            showId: "bulk-show",
            releasePattern: "bulk",
          },
        ],
        episodes: [],
      },
      {
        title: "Dynamic GenreTV",
        sourceUrl: "https://example.test",
        updatedLabel: "Updated Jun.17, 2026:",
        generatedAt: "2026-07-07T00:00:00.000Z",
      },
      { asOf: "2026-07-23" },
    );

    expect(schedule.entries[0]).toMatchObject({
      section: "waiting",
      endedReason: "Unknown",
    });
  });

  test("uses a complete set of episode dates as the season finale", () => {
    const schedule = buildScheduleFromRegistryRows(
      {
        shows: [{ ...seed.rows.shows[0]!, id: "episodic-show" }],
        seasons: [
          {
            ...seed.rows.seasons[0]!,
            id: "episodic-season",
            showId: "episodic-show",
            episodeCount: 2,
            finaleWindow: null,
          },
        ],
        episodes: [
          {
            id: "episodic-1",
            seasonId: "episodic-season",
            episodeLabel: "E1",
            title: null,
            releaseWindow: releaseWindow("Jun.21", 6, 21),
            sortKey: "001",
            externalLinks: [],
            notes: null,
          },
          {
            id: "episodic-2",
            seasonId: "episodic-season",
            episodeLabel: "E2",
            title: null,
            releaseWindow: releaseWindow("Jun.28", 6, 28),
            sortKey: "002",
            externalLinks: [],
            notes: null,
          },
        ],
      },
      {
        title: "Dynamic GenreTV",
        sourceUrl: "https://example.test",
        updatedLabel: "Updated Jun.17, 2026:",
        generatedAt: "2026-07-07T00:00:00.000Z",
      },
      { asOf: "2026-07-10" },
    );

    expect(schedule.entries[0]?.section).toBe("waiting");
  });

  test("infers the next year for yearless upcoming dates before the source update month", () => {
    const metadata = {
      title: "Dynamic GenreTV",
      sourceUrl: "https://example.test",
      updatedLabel: "Updated Jun.17, 2026:",
      generatedAt: "2026-07-07T00:00:00.000Z",
    };
    const rows: CanonicalRegistrySeed["rows"] = {
      shows: [{ ...seed.rows.shows[0]!, id: "new-year-show" }],
      seasons: [
        {
          ...seed.rows.seasons[0]!,
          id: "new-year-season",
          showId: "new-year-show",
          section: "upcoming",
          releaseWindow: releaseWindow("Jan.2", 1, 2),
        },
      ],
      episodes: [],
    };

    expect(buildScheduleFromRegistryRows(rows, metadata, { asOf: "2026-12-31" }).entries[0]?.section).toBe("upcoming");
    expect(buildScheduleFromRegistryRows(rows, metadata, { asOf: "2027-01-03" }).entries[0]?.section).toBe("current");
  });

  test("filters by section, language, organization, ending, and query", () => {
    const schedule = buildTestSchedule();
    const entries = filterScheduleEntries(schedule.entries, {
      ...defaultScheduleViewPreferences,
      section: "past",
      query: "super",
      languages: ["en"],
      organization: "Netflix",
      ending: "canceled",
      pageSize: 50,
    });
    expect(entries.map((entry) => entry.id)).toEqual(["past-c"]);
  });

  test("returns stable filter options", () => {
    const schedule = buildTestSchedule();
    expect(scheduleFilterOptions(schedule.entries)).toEqual({
      countries: [],
      languages: ["da", "en"],
      organizations: ["Apple", "Netflix"],
    });
  });

  test("groups schedule entries into show management rows", () => {
    const schedule = buildTestSchedule();
    const shows = buildManagementShows(schedule.entries);
    expect(shows.map((show) => show.id)).toEqual(["show-a", "show-b", "show-c"]);
    expect(findManagementShow(shows, "show-c")?.seasons).toMatchObject([
      {
        endedReason: "Canceled",
        languages: ["en", "da"],
        notes: null,
        seasonLabel: "S6",
      },
    ]);
    expect(findManagementShow(shows, "show-c")).toMatchObject({
      listedSeasonCount: 1,
      knownSeasonCount: 6,
    });
    expect(formatKnownSeasonCount(findManagementShow(shows, "show-c")!)).toBe("6+");
    expect(
      filterManagementShows(shows, {
        ...defaultManagementViewPreferences,
        query: "super",
        organization: "Netflix",
        languages: ["en"],
      }).map((show) => show.id),
    ).toEqual(["show-c"]);
    expect(
      filterManagementShows(shows, {
        ...defaultManagementViewPreferences,
        sort: "seasonCount",
      }).map((show) => show.id),
    ).toEqual(["show-c", "show-a", "show-b"]);
  });

  test("finds a management season by show and season id", () => {
    const schedule = buildTestSchedule();
    const shows = buildManagementShows(schedule.entries);
    expect(findManagementSeason(shows, "show-b", "upcoming-b")).toMatchObject({
      show: { title: "B Show" },
      season: { seasonLabel: "S1?" },
    });
    expect(findManagementSeason(shows, "show-b", "upcoming-b")?.season).toMatchObject({
      episodeCount: 2,
      episodes: [{ title: "Pilot" }, { title: "Second Landing" }],
    });
    expect(findManagementSeason(shows, "show-b", "missing")).toBeNull();
  });

  test("paginates lists with a minimum page count of one", () => {
    expect(paginateItems(["a", "b", "c"], 2, 20)).toEqual([]);
    expect(paginateItems(["a", "b", "c"], 1, 20)).toEqual(["a", "b", "c"]);
    expect(pageCountFor(0, 20)).toBe(1);
    expect(pageCountFor(101, 50)).toBe(3);
  });

  test("formats explicit and derived episode counts", () => {
    const schedule = buildTestSchedule();
    expect(formatEpisodeCount(null, [])).toBe("Unknown");
    expect(formatEpisodeCount(null, schedule.entries[1]?.episodes ?? [])).toBe("2");
    expect(formatEpisodeCount(10, schedule.entries[1]?.episodes ?? [])).toBe("10");
  });

  test("formats official season counts separately from special releases", () => {
    expect(formatScheduleSeasonCount({ seasonLabel: "S6" })).toBe("6");
    expect(formatScheduleSeasonCount({ seasonLabel: "S2 + special" })).toBe("2 + 1 special");
    expect(formatScheduleSeasonCount({ seasonLabel: "Special" })).toBe("1 special");
    expect(formatScheduleSeasonCount({ seasonLabel: "S3?" })).toBe("3");
  });

  test("does not count standalone specials as official seasons", () => {
    const shows = buildManagementShows([
      {
        ...buildTestSchedule().entries[0]!,
        id: "special-row",
        showId: "special-show",
        seasonLabel: "Special",
        title: "Standalone Special",
      },
    ]);
    expect(shows[0]).toMatchObject({
      knownSeasonCount: 0,
      listedSeasonCount: 1,
    });
  });
});

function releaseWindow(raw: string, month: number, day: number) {
  return {
    raw,
    precision: "month_day",
    confidence: "confirmed",
    year: null,
    month,
    day,
    releaseSeason: null,
  };
}

function buildTestSchedule() {
  return buildScheduleFromRegistrySeed(seed, { asOf: "2026-07-10" });
}

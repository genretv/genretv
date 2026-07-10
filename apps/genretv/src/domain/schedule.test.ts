import { describe, expect, test } from "bun:test";

import {
  buildManagementShows,
  buildScheduleFromRegistryRows,
  buildScheduleFromRegistrySeed,
  defaultManagementViewPreferences,
  defaultScheduleSortDirection,
  defaultScheduleViewPreferences,
  filterManagementShows,
  findManagementShow,
  findManagementSeason,
  findOrganizationLink,
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
        lifecycleStatus: "open",
        endedReason: null,
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
        lifecycleStatus: "open",
        endedReason: null,
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
        lifecycleStatus: "cancelled",
        endedReason: "Canceled",
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
        seasonNumber: 2,
        seasonLabel: "S2",
        title: null,
        releaseKind: "season",
        isFinal: false,
        timing: "Friday",
        releasePattern: "weekly",
        releasePrecision: "unknown",
        dateConfidence: "unknown",
        releaseWindow: null,
        finaleWindow: null,
        sortKey: null,
        episodeCount: null,
        organizations: [
          {
            name: "Apple",
            role: "streamer",
            externalLinks: [{ label: "Apple", url: "https://tv.apple.com/" }],
          },
        ],
        externalLinks: [],
        notes: null,
      },
      {
        id: "upcoming-b",
        showId: "show-b",
        section: "upcoming",
        seasonNumber: 1,
        seasonLabel: "S1?",
        title: null,
        releaseKind: "season",
        isFinal: false,
        timing: "Spring",
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
        organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
        externalLinks: [],
        notes: null,
      },
      {
        id: "past-c",
        showId: "show-c",
        section: "past",
        seasonNumber: 6,
        seasonLabel: "S6",
        title: null,
        releaseKind: "season",
        isFinal: false,
        timing: "2024",
        releasePattern: "weekly",
        releasePrecision: "unknown",
        dateConfidence: "unknown",
        releaseWindow: null,
        finaleWindow: null,
        sortKey: null,
        episodeCount: null,
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
  test("finds safe organization links without guessing across multiple organizations", () => {
    const links = [
      { label: "Apple", url: "https://tv.apple.com/show/1" },
      { label: "Netflix", url: "javascript:alert(1)" },
      { kind: "official", label: "Official page", url: "https://example.test/show/1" },
    ];

    expect(findOrganizationLink("Apple", links, 2)?.url).toBe("https://tv.apple.com/show/1");
    expect(findOrganizationLink("Netflix", links, 2)).toBeNull();
    expect(findOrganizationLink("Max", links, 2)).toBeNull();
    expect(findOrganizationLink("Max", links, 1)?.url).toBe("https://tv.apple.com/show/1");
  });

  test("builds display entries from the canonical registry seed", () => {
    const schedule = buildTestSchedule();
    const current = schedule.entries.find((entry) => entry.id === "current-a")!;
    const upcoming = schedule.entries.find((entry) => entry.id === "upcoming-b")!;
    const finished = schedule.entries.find((entry) => entry.id === "past-c")!;
    expect(current.title).toBe("A Show");
    expect(current.originalTitle).toBeNull();
    expect(current.seasonLabel).toBe("S2");
    expect(current.seasonLinks).toEqual([{ label: "Apple", url: "https://tv.apple.com/" }]);
    expect(upcoming.languages).toEqual(["en"]);
    expect(upcoming.episodeCount).toBe(2);
    expect(upcoming.episodes.map((episode) => episode.episodeLabel)).toEqual(["E1", "E2"]);
    expect(upcoming.episodes[0]).toMatchObject({
      releaseDate: "Mar.1",
      notes: "First episode",
    });
    expect(finished.endedReason).toBe("Canceled");
    expect(finished.endingKind).toBe("canceled");
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
    expect(
      schedule.entries.find((entry) => entry.id === "upcoming-b")?.episodes.map((episode) => episode.title),
    ).toEqual(["Pilot", "Second Landing"]);
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
          isFinal: true,
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
      { id: "started-upcoming", section: "current" },
      { id: "future-upcoming", section: "upcoming" },
      { id: "recent-bulk", section: "current" },
    ]);
    expect(schedule.allEntries.find((entry) => entry.id === "waiting-weekly")?.section).toBe("waiting");
    expect(schedule.allEntries.find((entry) => entry.id === "finished-final-season")?.section).toBe("past");
    expect(schedule.allEntries.find((entry) => entry.id === "started-upcoming")?.timing).toBe("Sunday · finale Aug.9");
    expect(schedule.allEntries.find((entry) => entry.id === "recent-bulk")?.timing).toBe("Binge");
    expect(formatScheduleStatus("waiting", null)).toBe("Awaiting Renewal or Cancellation");
    expect(schedule.counts).toEqual({ current: 2, upcoming: 1, waiting: 0, past: 0 });
    expect(
      buildManagementShows(schedule.allEntries)[0]?.seasons.find((season) => season.id === "waiting-weekly"),
    ).toMatchObject({
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
      endedReason: null,
    });
  });

  test("keeps a dated bulk release current for five weeks", () => {
    const rows: CanonicalRegistrySeed["rows"] = {
      shows: [{ ...seed.rows.shows[0]!, id: "dated-bulk-show" }],
      seasons: [
        {
          ...seed.rows.seasons[0]!,
          id: "dated-bulk-season",
          showId: "dated-bulk-show",
          section: "upcoming",
          releasePattern: "bulk",
          releaseWindow: releaseWindow("Jun.25", 6, 25),
          finaleWindow: null,
        },
      ],
      episodes: [],
    };
    const metadata = {
      title: "Dynamic GenreTV",
      sourceUrl: "https://example.test",
      updatedLabel: "Updated Jun.17, 2026:",
      generatedAt: "2026-07-07T00:00:00.000Z",
    };

    expect(buildScheduleFromRegistryRows(rows, metadata, { asOf: "2026-07-30" }).entries[0]).toMatchObject({
      section: "current",
      timing: "Binge",
    });
    expect(buildScheduleFromRegistryRows(rows, metadata, { asOf: "2026-07-31" }).entries[0]?.section).toBe("waiting");
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

  test("keeps estimated greenlit seasons upcoming after their ordering period ends", () => {
    const rows: CanonicalRegistrySeed["rows"] = {
      shows: [{ ...seed.rows.shows[0]!, id: "estimated-show" }],
      seasons: [
        {
          ...seed.rows.seasons[0]!,
          id: "estimated-season",
          showId: "estimated-show",
          section: "upcoming",
          seasonNumber: 3,
          dateConfidence: "estimated",
          releaseWindow: {
            raw: "Spring 2027",
            precision: "release_season",
            confidence: "estimated",
            year: 2027,
            month: null,
            day: null,
            releaseSeason: "spring",
          },
        },
      ],
      episodes: [],
    };

    const schedule = buildScheduleFromRegistryRows(
      rows,
      {
        title: "Estimated GenreTV",
        sourceUrl: "https://example.test",
        updatedLabel: "Updated Jun.17, 2026:",
        generatedAt: "2026-07-07T00:00:00.000Z",
      },
      { asOf: "2027-12-31" },
    );

    expect(schedule.entries).toMatchObject([{ id: "estimated-season", section: "upcoming" }]);
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
    const shows = buildManagementShows(schedule.allEntries);
    expect(shows.map((show) => show.id)).toEqual(["show-a", "show-b", "show-c"]);
    expect(findManagementShow(shows, "show-c")?.seasons).toMatchObject([
      {
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
    const shows = buildManagementShows(schedule.allEntries);
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
    const episodes = schedule.entries.find((entry) => entry.id === "upcoming-b")?.episodes ?? [];
    expect(formatEpisodeCount(null, [])).toBe("Unknown");
    expect(formatEpisodeCount(null, episodes)).toBe("2");
    expect(formatEpisodeCount(10, episodes)).toBe("10");
  });

  test("formats official season counts separately from special releases", () => {
    const finishedRelease = {
      section: "past" as const,
      seasonNumber: 6,
      seasonLabel: "S6",
      releaseKind: "season" as const,
    };
    expect(
      formatScheduleSeasonCount({ ...finishedRelease, officialSeasonCount: 6, movieCount: 0, specialCount: 0 }),
    ).toBe("6");
    expect(
      formatScheduleSeasonCount({ ...finishedRelease, officialSeasonCount: 2, movieCount: 1, specialCount: 0 }),
    ).toBe("2 + 1 movie");
    expect(
      formatScheduleSeasonCount({ ...finishedRelease, officialSeasonCount: 2, movieCount: 0, specialCount: 1 }),
    ).toBe("2 + 1 special");
    expect(
      formatScheduleSeasonCount({ ...finishedRelease, officialSeasonCount: 0, movieCount: 0, specialCount: 1 }),
    ).toBe("1 special");
  });

  test("formats active and upcoming rows as their specific release", () => {
    expect(
      formatScheduleSeasonCount({
        section: "upcoming",
        seasonNumber: 4,
        seasonLabel: "S4",
        releaseKind: "season",
        officialSeasonCount: 5,
        movieCount: 0,
        specialCount: 0,
      }),
    ).toBe("4");
    expect(
      formatScheduleSeasonCount({
        section: "upcoming",
        seasonNumber: null,
        seasonLabel: "Special",
        releaseKind: "special",
        officialSeasonCount: 2,
        movieCount: 0,
        specialCount: 1,
      }),
    ).toBe("Special");
  });

  test("orders Upcoming by When instead of imported source position", () => {
    const upcoming = buildTestSchedule().entries.find((entry) => entry.section === "upcoming")!;
    const entries = [
      { ...upcoming, id: "autumn-2027", sortKey: "2027-11-30", timing: "Autumn 2027" },
      { ...upcoming, id: "autumn-2028", sortKey: "2028-11-30", timing: "Autumn 2028" },
      { ...upcoming, id: "december-2026", sortKey: "2026-12-25", timing: "Dec. 25" },
    ];

    expect(
      filterScheduleEntries(entries, { ...defaultScheduleViewPreferences, section: "upcoming" }).map(
        (entry) => entry.id,
      ),
    ).toEqual(["december-2026", "autumn-2027", "autumn-2028"]);
  });

  test("orders Finished by reverse When while keeping unknown dates last", () => {
    expect(defaultScheduleSortDirection("when", "past")).toBe("descending");
    expect(defaultScheduleSortDirection("when", "current")).toBe("ascending");
    expect(defaultScheduleSortDirection("when", "upcoming")).toBe("ascending");
    expect(defaultScheduleSortDirection("when", "waiting")).toBe("ascending");

    const finished = buildTestSchedule().entries.find((entry) => entry.section === "past")!;
    const entries = [
      { ...finished, id: "finished-2022", sortKey: "2022-06-15" },
      { ...finished, id: "finished-unknown", sortKey: null },
      { ...finished, id: "finished-2024", sortKey: "2024-09-01" },
    ];

    expect(
      filterScheduleEntries(entries, {
        ...defaultScheduleViewPreferences,
        section: "past",
        sortDirection: "descending",
      }).map((entry) => entry.id),
    ).toEqual(["finished-2024", "finished-2022", "finished-unknown"]);
  });

  test("labels a concluded final season as finished", () => {
    expect(formatScheduleStatus("upcoming", null, true)).toBe("Upcoming");
    expect(formatScheduleStatus("current", null, true)).toBe("Now Showing");
    expect(formatScheduleStatus("past", null, true)).toBe("Finished");
    expect(formatScheduleStatus("past", "Final season", true)).toBe("Finished");
  });

  test("sorts imprecise periods at their inclusive end after covered exact dates", () => {
    const upcoming = buildTestSchedule().entries.find((entry) => entry.section === "upcoming")!;
    const entries = [
      {
        ...upcoming,
        id: "year-2027",
        title: "Broad year",
        sortKey: null,
        releasePrecision: "year",
        releaseWindow: {
          raw: "2027",
          precision: "year",
          confidence: "expected",
          year: 2027,
          month: null,
          day: null,
          releaseSeason: null,
        },
      },
      {
        ...upcoming,
        id: "date-2027-12-30",
        title: "Dated before year end",
        sortKey: null,
        releasePrecision: "day",
        releaseWindow: {
          raw: "2027-12-30",
          precision: "day",
          confidence: "confirmed",
          year: 2027,
          month: 12,
          day: 30,
          releaseSeason: null,
        },
      },
      {
        ...upcoming,
        id: "date-2027-12-31",
        title: "Dated on year end",
        sortKey: null,
        releasePrecision: "day",
        releaseWindow: {
          raw: "2027-12-31",
          precision: "day",
          confidence: "confirmed",
          year: 2027,
          month: 12,
          day: 31,
          releaseSeason: null,
        },
      },
    ];

    expect(
      filterScheduleEntries(entries, {
        ...defaultScheduleViewPreferences,
        section: "upcoming",
      }).map((entry) => entry.id),
    ).toEqual(["date-2027-12-30", "date-2027-12-31", "year-2027"]);

    expect(
      filterScheduleEntries(
        entries.map((entry) => ({ ...entry, section: "past" as const })),
        {
          ...defaultScheduleViewPreferences,
          section: "past",
          sortDirection: "descending",
        },
      ).map((entry) => entry.id),
    ).toEqual(["date-2027-12-31", "date-2027-12-30", "year-2027"]);
  });

  test("uses the actual month end for imprecise months", () => {
    const upcoming = buildTestSchedule().entries.find((entry) => entry.section === "upcoming")!;
    const entries = [
      {
        ...upcoming,
        id: "february-2028",
        title: "Broad February",
        sortKey: null,
        releasePrecision: "month",
        releaseWindow: {
          raw: "February 2028",
          precision: "month",
          confidence: "expected",
          year: 2028,
          month: 2,
          day: null,
          releaseSeason: null,
        },
      },
      {
        ...upcoming,
        id: "date-2028-02-29",
        title: "Dated in February",
        sortKey: null,
        releasePrecision: "day",
        releaseWindow: {
          raw: "2028-02-29",
          precision: "day",
          confidence: "confirmed",
          year: 2028,
          month: 2,
          day: 29,
          releaseSeason: null,
        },
      },
      {
        ...upcoming,
        id: "date-2028-03-01",
        title: "Dated after February",
        sortKey: null,
        releasePrecision: "day",
        releaseWindow: {
          raw: "2028-03-01",
          precision: "day",
          confidence: "confirmed",
          year: 2028,
          month: 3,
          day: 1,
          releaseSeason: null,
        },
      },
    ];

    expect(
      filterScheduleEntries(entries, {
        ...defaultScheduleViewPreferences,
        section: "upcoming",
      }).map((entry) => entry.id),
    ).toEqual(["date-2028-02-29", "february-2028", "date-2028-03-01"]);
  });

  test("sorts visible columns in either direction", () => {
    const upcoming = buildTestSchedule().entries.find((entry) => entry.section === "upcoming")!;
    const entries = [
      { ...upcoming, id: "season-2", seasonNumber: 2, seasonLabel: "S2", title: "Beta" },
      { ...upcoming, id: "season-4", seasonNumber: 4, seasonLabel: "S4", title: "Alpha" },
    ];

    expect(
      filterScheduleEntries(entries, {
        ...defaultScheduleViewPreferences,
        section: "upcoming",
        sort: "seasons",
        sortDirection: "descending",
      }).map((entry) => entry.id),
    ).toEqual(["season-4", "season-2"]);
    expect(
      filterScheduleEntries(entries, {
        ...defaultScheduleViewPreferences,
        section: "upcoming",
        sort: "title",
        sortDirection: "ascending",
      }).map((entry) => entry.id),
    ).toEqual(["season-4", "season-2"]);
  });

  test("does not count standalone specials as official seasons", () => {
    const shows = buildManagementShows([
      {
        ...buildTestSchedule().entries[0]!,
        id: "special-row",
        showId: "special-show",
        seasonLabel: "Special",
        title: "Standalone Special",
        releaseTitle: "Standalone Special",
        releaseKind: "special",
        seasonNumber: null,
      },
    ]);
    expect(shows[0]).toMatchObject({
      knownSeasonCount: 0,
      listedSeasonCount: 0,
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

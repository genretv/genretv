import { describe, expect, test } from "bun:test";

import {
  buildManagementShows,
  buildScheduleFromRegistrySeed,
  defaultScheduleViewPreferences,
  filterManagementShows,
  findManagementShow,
  findManagementSeason,
  filterScheduleEntries,
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
        episodeCount: null,
        sourceRow: 2,
        organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
        externalLinks: [],
        notes: null,
      },
      {
        id: "past-c",
        showId: "show-c",
        section: "past",
        seasonLabel: "S1",
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
    episodes: [],
  },
};

describe("schedule read model", () => {
  test("builds display entries from the canonical registry seed", () => {
    const schedule = buildScheduleFromRegistrySeed(seed);
    expect(schedule.entries[0]?.title).toBe("A Show");
    expect(schedule.entries[0]?.seasonLabel).toBe("S2");
    expect(schedule.entries[1]?.languages).toEqual(["en"]);
    expect(schedule.entries[2]?.endedReason).toBe("Canceled");
    expect(schedule.entries[2]?.endingKind).toBe("canceled");
  });

  test("filters by section, language, organization, ending, and query", () => {
    const schedule = buildScheduleFromRegistrySeed(seed);
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
    const schedule = buildScheduleFromRegistrySeed(seed);
    expect(scheduleFilterOptions(schedule.entries)).toEqual({
      countries: [],
      languages: ["da", "en"],
      organizations: ["Apple", "Netflix"],
    });
  });

  test("groups schedule entries into show management rows", () => {
    const schedule = buildScheduleFromRegistrySeed(seed);
    const shows = buildManagementShows(schedule.entries);
    expect(shows.map((show) => show.id)).toEqual(["show-a", "show-b", "show-c"]);
    expect(findManagementShow(shows, "show-c")?.seasons).toMatchObject([
      {
        endedReason: "Canceled",
        languages: ["en", "da"],
        seasonLabel: "S1",
      },
    ]);
    expect(filterManagementShows(shows, "super", "Netflix", ["en"], []).map((show) => show.id)).toEqual(["show-c"]);
  });

  test("finds a management season by show and season id", () => {
    const schedule = buildScheduleFromRegistrySeed(seed);
    const shows = buildManagementShows(schedule.entries);
    expect(findManagementSeason(shows, "show-b", "upcoming-b")).toMatchObject({
      show: { title: "B Show" },
      season: { seasonLabel: "S1?" },
    });
    expect(findManagementSeason(shows, "show-b", "missing")).toBeNull();
  });

  test("paginates lists with a minimum page count of one", () => {
    expect(paginateItems(["a", "b", "c"], 2, 20)).toEqual([]);
    expect(paginateItems(["a", "b", "c"], 1, 20)).toEqual(["a", "b", "c"]);
    expect(pageCountFor(0, 20)).toBe(1);
    expect(pageCountFor(101, 50)).toBe(3);
  });
});

import { describe, expect, test } from "bun:test";

import {
  buildScheduleFromSeed,
  defaultScheduleViewPreferences,
  filterScheduleEntries,
  scheduleFilterOptions,
  type BlogspotCanonicalSeed,
} from "./schedule";

const seed: BlogspotCanonicalSeed = {
  generatedAt: "2026-07-07T00:00:00.000Z",
  source: {
    pageTitle: "GenreTV test",
    updatedLabel: "Updated today",
    url: "https://example.test",
  },
  summary: {
    totalEntries: 3,
    bySection: {
      current: 1,
      upcoming: 1,
      past: 1,
    },
  },
  entries: [
    {
      id: "current-a",
      section: "current",
      sourceRow: 3,
      show: { displayTitle: "A Show", externalLinks: [], languages: ["da"] },
      season: {
        rawSeason: "2",
        labelKind: "numbered",
        number: 2,
        tentative: false,
        extraMovie: false,
        hiatus: false,
        releasePattern: "weekly",
        releaseWindow: null,
        finaleWindow: null,
        lifecycleMarkers: [],
        legacyStatus: "",
        legacyTiming: "Friday",
      },
      organizations: [{ name: "Apple", role: "streamer", externalLinks: [] }],
      genreTags: ["Fantasy"],
      notes: [],
      legacy: { genreText: "Fantasy", organizationText: "Apple", detailText: "", cells: [] },
    },
    {
      id: "upcoming-b",
      section: "upcoming",
      sourceRow: 2,
      show: { displayTitle: "B Show", externalLinks: [], languages: ["en"] },
      season: {
        rawSeason: "1",
        labelKind: "numbered",
        number: 1,
        tentative: true,
        extraMovie: false,
        hiatus: false,
        releasePattern: "weekly",
        releaseWindow: { raw: "Spring", precision: "season", confidence: "expected", year: 2027, month: null, day: null, releaseSeason: "spring" },
        finaleWindow: null,
        lifecycleMarkers: [],
        legacyStatus: "",
        legacyTiming: "Spring",
      },
      organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
      genreTags: ["Sci-Fi"],
      notes: [],
      legacy: { genreText: "Sci-Fi", organizationText: "Netflix", detailText: "", cells: [] },
    },
    {
      id: "past-c",
      section: "past",
      sourceRow: 1,
      show: { displayTitle: "C Show", externalLinks: [], languages: ["en", "da"] },
      season: {
        rawSeason: "1",
        labelKind: "numbered",
        number: 1,
        tentative: false,
        extraMovie: false,
        hiatus: false,
        releasePattern: "weekly",
        releaseWindow: null,
        finaleWindow: null,
        lifecycleMarkers: [],
        legacyStatus: "Canceled",
        legacyTiming: "",
      },
      organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
      genreTags: ["Supernatural"],
      notes: [],
      legacy: { genreText: "Supernatural", organizationText: "Netflix", detailText: "2024", cells: [] },
    },
  ],
};

describe("schedule read model", () => {
  test("builds display entries from the scraped seed", () => {
    const schedule = buildScheduleFromSeed(seed);
    expect(schedule.entries[0]?.title).toBe("A Show");
    expect(schedule.entries[0]?.seasonLabel).toBe("S2");
    expect(schedule.entries[2]?.endedReason).toBe("Canceled");
    expect(schedule.entries[2]?.endingKind).toBe("canceled");
  });

  test("filters by section, language, organization, ending, and query", () => {
    const schedule = buildScheduleFromSeed(seed);
    const entries = filterScheduleEntries(schedule.entries, {
      ...defaultScheduleViewPreferences,
      section: "past",
      query: "super",
      language: "en",
      organization: "Netflix",
      ending: "canceled",
    });
    expect(entries.map((entry) => entry.id)).toEqual(["past-c"]);
  });

  test("returns stable filter options", () => {
    const schedule = buildScheduleFromSeed(seed);
    expect(scheduleFilterOptions(schedule.entries)).toEqual({
      languages: ["da", "en"],
      organizations: ["Apple", "Netflix"],
    });
  });
});

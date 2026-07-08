import { describe, expect, test } from "bun:test";

import { buildCanonicalRegistrySeedRows, type BlogspotCanonicalSeed } from "./canonical-seed";

const seed: BlogspotCanonicalSeed = {
  entries: [
    {
      id: "upcoming-1-the-show",
      section: "upcoming",
      sourceRow: 2,
      show: {
        displayTitle: "The Show",
        externalLinks: [{ kind: "imdb", label: "IMDb", url: "https://www.imdb.com/title/tt1/" }],
        languages: [],
      },
      season: {
        rawSeason: "1",
        tentative: true,
        extraMovie: false,
        releasePattern: "unknown",
        releaseWindow: {
          raw: "Summer 2027",
          precision: "release_season",
          confidence: "estimated",
          year: 2027,
          month: null,
          day: null,
          releaseSeason: "summer",
        },
        finaleWindow: null,
        lifecycleMarkers: [],
        legacyStatus: "",
        legacyTiming: "Summer 2027",
      },
      organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
      genreTags: ["Fantasy"],
      notes: ["source note"],
      legacy: { detailText: "" },
    },
    {
      id: "past-2-the-show",
      section: "past",
      sourceRow: 5,
      show: {
        displayTitle: "The Show",
        externalLinks: [{ kind: "official", label: "Official", url: "https://example.test/show" }],
        languages: ["da"],
        countries: ["DK"],
      },
      season: {
        rawSeason: "2",
        tentative: false,
        extraMovie: false,
        releasePattern: "weekly",
        releaseWindow: null,
        finaleWindow: null,
        lifecycleMarkers: [{ meaning: "cancelled" }],
        legacyStatus: "",
        legacyTiming: "",
      },
      organizations: [{ name: "DR", role: "network", externalLinks: [] }],
      genreTags: ["Supernatural"],
      notes: [],
      legacy: { detailText: "2024" },
    },
  ],
};

describe("canonical registry seed rows", () => {
  test("builds deterministic canonical show and season rows from the Blogspot seed", () => {
    const first = buildCanonicalRegistrySeedRows(seed);
    const second = buildCanonicalRegistrySeedRows(seed);

    expect(first).toEqual(second);
    expect(first.shows).toHaveLength(1);
    expect(first.episodes).toEqual([]);
    expect(first.shows[0]).toMatchObject({
      displayTitle: "The Show",
      languages: ["en", "da"],
      countries: ["DK"],
      genreTags: ["Fantasy", "Supernatural"],
      notes: "source note",
    });
    expect(first.shows[0]?.externalLinks.map((link) => link.url)).toEqual([
      "https://www.imdb.com/title/tt1/",
      "https://example.test/show",
    ]);
    expect(first.shows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("preserves season metadata for sync", () => {
    const rows = buildCanonicalRegistrySeedRows(seed);

    expect(rows.seasons.map((season) => season.sourceRow)).toEqual([2, 5]);
    expect(rows.seasons[0]).toMatchObject({
      seasonLabel: "S1?",
      timing: "Summer 2027",
      releasePrecision: "release_season",
      dateConfidence: "estimated",
      sortKey: "2027-07-15",
      episodeCount: null,
      notes: "source note",
    });
    expect(rows.seasons[1]).toMatchObject({
      seasonLabel: "S2",
      endedReason: "Canceled",
      timing: "2024",
    });
  });
});

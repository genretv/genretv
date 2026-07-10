import { describe, expect, test } from "bun:test";

import {
  analyzeCanonicalRegistrySeedRows,
  buildCanonicalRegistrySeedRows,
  type BlogspotCanonicalSeed,
} from "./canonical-seed";

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
      lifecycleStatus: "cancelled",
      endedReason: "Canceled",
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
      seasonNumber: 1,
      seasonLabel: null,
      title: null,
      releaseKind: "season",
      isFinal: false,
      timing: "Summer 2027",
      releasePrecision: "release_season",
      dateConfidence: "estimated",
      sortKey: "2027-07-15",
      episodeCount: null,
      notes: "source note",
    });
    expect(rows.seasons[1]).toMatchObject({
      seasonNumber: 2,
      releaseKind: "season",
      timing: "2024",
    });
  });

  test("keeps extra releases separate from official season count labels", () => {
    const rows = buildCanonicalRegistrySeedRows({
      entries: [
        {
          ...seed.entries[0]!,
          id: "past-good-omens-special",
          season: { ...seed.entries[0]!.season, extraMovie: true, rawSeason: "2x", tentative: false },
        },
        {
          ...seed.entries[1]!,
          id: "past-punisher-special",
          show: { ...seed.entries[1]!.show, displayTitle: "The Punisher: One Last Kill", externalLinks: [] },
          season: { ...seed.entries[1]!.season, extraMovie: true, rawSeason: "x", tentative: false },
        },
      ],
    });

    expect(rows.seasons).toHaveLength(4);
    const releasesByShow = Map.groupBy(rows.seasons, (season) => season.showId);
    const goodOmens = rows.shows.find((show) => show.displayTitle === "The Show")!;
    const punisher = rows.shows.find((show) => show.displayTitle === "The Punisher: One Last Kill")!;
    expect(
      releasesByShow.get(goodOmens.id)?.map(({ releaseKind, seasonNumber }) => ({ releaseKind, seasonNumber })),
    ).toEqual([
      { releaseKind: "season", seasonNumber: 1 },
      { releaseKind: "season", seasonNumber: 2 },
      { releaseKind: "special", seasonNumber: null },
    ]);
    expect(
      releasesByShow.get(punisher.id)?.map(({ releaseKind, seasonNumber }) => ({ releaseKind, seasonNumber })),
    ).toEqual([{ releaseKind: "special", seasonNumber: null }]);
  });

  test("creates every known and greenlit numbered season with yearly estimated windows", () => {
    const rows = buildCanonicalRegistrySeedRows({
      generatedAt: "2026-07-07T11:10:24.233Z",
      source: { updatedLabel: "Updated Jun.17, 2026:" },
      entries: [
        {
          ...seed.entries[0]!,
          id: "upcoming-123-the-lord-of-the-rings",
          show: { ...seed.entries[0]!.show, displayTitle: "The Lord of the Rings" },
          season: {
            ...seed.entries[0]!.season,
            rawSeason: "3",
            tentative: false,
            releaseWindow: {
              raw: "Nov.11",
              precision: "month_day",
              confidence: "confirmed",
              year: null,
              month: 11,
              day: 11,
              releaseSeason: null,
            },
            lifecycleMarkers: [{ meaning: "renewed" }, { meaning: "legacy_x2" }],
          },
        },
      ],
    });

    expect(rows.seasons.map((season) => season.seasonNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.seasons.slice(3)).toMatchObject([
      {
        seasonNumber: 4,
        section: "upcoming",
        releasePrecision: "release_season",
        dateConfidence: "estimated",
        releaseWindow: { year: 2027, releaseSeason: "autumn" },
      },
      {
        seasonNumber: 5,
        section: "upcoming",
        releasePrecision: "release_season",
        dateConfidence: "estimated",
        releaseWindow: { year: 2028, releaseSeason: "autumn" },
      },
    ]);
  });

  test("splits same-title shows when external identities conflict", () => {
    const rows = buildCanonicalRegistrySeedRows({
      entries: [
        {
          ...seed.entries[0]!,
          id: "past-488-dracula",
          sourceRow: 488,
          section: "past",
          show: {
            displayTitle: "Dracula",
            externalLinks: [{ kind: "imdb", label: "Dracula", url: "https://www.imdb.com/title/tt9139220/" }],
            languages: [],
          },
          season: { ...seed.entries[0]!.season, rawSeason: "1", tentative: false },
        },
        {
          ...seed.entries[1]!,
          id: "past-712-dracula",
          sourceRow: 712,
          section: "past",
          show: {
            displayTitle: "Dracula",
            externalLinks: [{ kind: "imdb", label: "Dracula", url: "https://www.imdb.com/title/tt2297724/" }],
            languages: [],
          },
          season: { ...seed.entries[1]!.season, rawSeason: "1", tentative: false },
        },
      ],
    });

    expect(rows.shows).toHaveLength(2);
    expect(new Set(rows.seasons.map((season) => season.showId)).size).toBe(2);
    expect(analyzeCanonicalRegistrySeedRows(rows).errors).toEqual([]);
  });

  test("normalizes ordered language and country codes", () => {
    const rows = buildCanonicalRegistrySeedRows({
      entries: [
        {
          ...seed.entries[0]!,
          show: {
            displayTitle: "Code Show",
            externalLinks: [],
            languages: [" EN ", "da", "EN", "not-a-code"],
            countries: [" uk ", "US", "usa", "not-a-country"],
          },
        },
      ],
    });

    expect(rows.shows[0]).toMatchObject({
      languages: ["en", "da"],
      countries: ["GB", "US"],
    });
  });

  test("reports duplicate structured season identities as blocking quality errors", () => {
    const rows = buildCanonicalRegistrySeedRows({
      entries: [seed.entries[0]!],
    });
    rows.seasons.push({ ...rows.seasons[0]!, id: "duplicate-id" });

    expect(analyzeCanonicalRegistrySeedRows(rows).errors).toMatchObject([
      {
        code: "duplicate-season-identity",
      },
    ]);
  });

  test("requires every show to own a season", () => {
    const rows = buildCanonicalRegistrySeedRows(seed);
    rows.seasons = rows.seasons.filter((season) => season.showId !== rows.shows[0]!.id);

    expect(analyzeCanonicalRegistrySeedRows(rows).errors).toMatchObject([{ code: "show-without-season" }]);
  });
});

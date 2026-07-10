import { describe, expect, test } from "bun:test";

import {
  applyLinkedPublishedImports,
  applyPersonalEpisodes,
  applyPersonalExclusions,
  applyPersonalSeasons,
} from "./live-canonical-schedule";
import type { CanonicalEpisodeSeedRow, CanonicalSeasonSeedRow, CanonicalShowSeedRow } from "./schedule";

describe("live canonical personal overlay rows", () => {
  test("removes excluded canonical seasons and their episodes", () => {
    const shows: CanonicalShowSeedRow[] = [showRow("show-1")];
    const seasons: CanonicalSeasonSeedRow[] = [seasonRow("season-1", "show-1"), seasonRow("season-2", "show-1")];
    const episodes: CanonicalEpisodeSeedRow[] = [
      {
        id: "episode-1",
        seasonId: "season-1",
        episodeLabel: "E1",
        title: "Pilot",
        releaseWindow: null,
        sortKey: "001",
        externalLinks: [],
        notes: null,
      },
    ];

    const filtered = applyPersonalExclusions({ shows, seasons, episodes }, [
      {
        excludedKind: "season",
        canonicalShowId: null,
        canonicalSeasonId: "season-1",
        canonicalEpisodeId: null,
      },
    ]);

    expect(filtered.shows.map((show) => show.id)).toEqual(["show-1"]);
    expect(filtered.seasons.map((season) => season.id)).toEqual(["season-2"]);
    expect(filtered.episodes).toEqual([]);
  });

  test("removes excluded canonical shows and their children", () => {
    const filtered = applyPersonalExclusions(
      {
        shows: [showRow("show-1"), showRow("show-2")],
        seasons: [seasonRow("season-1", "show-1"), seasonRow("season-2", "show-2")],
        episodes: [
          {
            id: "episode-1",
            seasonId: "season-1",
            episodeLabel: "E1",
            title: "Pilot",
            releaseWindow: null,
            sortKey: "001",
            externalLinks: [],
            notes: null,
          },
        ],
      },
      [
        {
          excludedKind: "show",
          canonicalShowId: "show-1",
          canonicalSeasonId: null,
          canonicalEpisodeId: null,
        },
      ],
    );

    expect(filtered.shows.map((show) => show.id)).toEqual(["show-2"]);
    expect(filtered.seasons.map((season) => season.id)).toEqual(["season-2"]);
    expect(filtered.episodes).toEqual([]);
  });

  test("adds personal seasons with source metadata", () => {
    const seasons = applyPersonalSeasons(
      [],
      [
        {
          id: "personal-season-1",
          canonicalSeasonId: null,
          canonicalShowId: null,
          personalShowId: "personal-show-1",
          section: "current",
          seasonNumber: 1,
          seasonLabel: "S1",
          title: null,
          releaseKind: "season",
          isFinal: false,
          timing: "Fridays",
          releasePattern: "weekly",
          releasePrecision: "day",
          dateConfidence: "confirmed",
          releaseWindow: { raw: "2026-07-08", precision: "day", confidence: "confirmed" },
          finaleWindow: null,
          sortKey: "002",
          episodeCount: null,
          organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
          externalLinks: [{ label: "Wikipedia", url: "https://wikipedia.test/shared-show" }],
          notes: "Imported",
        },
      ],
    );

    expect(seasons).toEqual([
      {
        id: "personal-season-1",
        showId: "personal-show-1",
        section: "current",
        seasonNumber: 1,
        seasonLabel: "S1",
        title: null,
        releaseKind: "season",
        isFinal: false,
        timing: "Fridays",
        releasePattern: "weekly",
        releasePrecision: "day",
        dateConfidence: "confirmed",
        releaseWindow: {
          raw: "2026-07-08",
          precision: "day",
          confidence: "confirmed",
          year: null,
          month: null,
          day: null,
          releaseSeason: null,
        },
        finaleWindow: null,
        sortKey: "002",
        episodeCount: null,
        organizations: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
        externalLinks: [{ label: "Wikipedia", url: "https://wikipedia.test/shared-show" }],
        notes: "Imported",
      } satisfies CanonicalSeasonSeedRow,
    ]);
  });

  test("adds personal episodes under personal-only seasons", () => {
    const canonicalRows: CanonicalEpisodeSeedRow[] = [];

    const episodes = applyPersonalEpisodes(canonicalRows, [
      {
        id: "personal-episode-1",
        canonicalEpisodeId: null,
        canonicalSeasonId: null,
        personalSeasonId: "personal-season-1",
        episodeLabel: "E1",
        title: "Personal pilot",
        releaseWindow: { raw: "2026-07-08", precision: "day", confidence: "confirmed" },
        sortKey: "001",
        externalLinks: [],
        notes: "Added locally",
      },
    ]);

    expect(episodes).toEqual([
      {
        id: "personal-episode-1",
        seasonId: "personal-season-1",
        episodeLabel: "E1",
        title: "Personal pilot",
        releaseWindow: {
          raw: "2026-07-08",
          precision: "day",
          confidence: "confirmed",
          year: null,
          month: null,
          day: null,
          releaseSeason: null,
        },
        sortKey: "001",
        externalLinks: [],
        notes: "Added locally",
      },
    ]);
  });

  test("still adds personal episodes under canonical seasons", () => {
    const episodes = applyPersonalEpisodes(
      [],
      [
        {
          id: "personal-episode-2",
          canonicalEpisodeId: null,
          canonicalSeasonId: "canonical-season-1",
          personalSeasonId: null,
          episodeLabel: "E2",
          title: "Canonical parent",
          releaseWindow: null,
          sortKey: "002",
          externalLinks: [],
          notes: null,
        },
      ],
    );

    expect(episodes).toMatchObject([{ id: "personal-episode-2", seasonId: "canonical-season-1" }]);
  });

  test("materializes linked published imports from synced published rows", () => {
    const rows = applyLinkedPublishedImports(
      { shows: [], seasons: [], episodes: [] },
      [
        {
          importMode: "linked",
          importedKind: "season",
          sourcePublishedShowId: "published-show-1",
          sourcePublishedSeasonId: "published-season-1",
          sourcePublishedEpisodeId: null,
        },
      ],
      {
        shows: [
          {
            id: "published-show-1",
            publicationStatus: "published",
            displayTitle: "Shared Show",
            originalTitle: null,
            lifecycleStatus: "open",
            endedReason: null,
            languages: ["da", "sv"],
            countries: ["DK"],
            genreTags: ["Fantasy"],
            externalLinks: [],
            notes: null,
          },
        ],
        seasons: [
          {
            id: "published-season-1",
            publicationStatus: "published",
            publishedShowId: "published-show-1",
            section: "upcoming",
            seasonNumber: 2,
            seasonLabel: "S2",
            title: null,
            releaseKind: "season",
            isFinal: false,
            timing: "Autumn",
            releasePattern: "weekly",
            releasePrecision: "season",
            dateConfidence: "expected",
            releaseWindow: null,
            finaleWindow: null,
            sortKey: "2026-09",
            episodeCount: 2,
            organizations: [{ name: "DR", role: "broadcaster", externalLinks: [] }],
            externalLinks: [],
            notes: "Linked",
          },
        ],
        episodes: [
          {
            id: "published-episode-1",
            publicationStatus: "published",
            publishedSeasonId: "published-season-1",
            episodeLabel: "E1",
            title: "Return",
            releaseWindow: null,
            sortKey: "001",
            externalLinks: [],
            notes: null,
          },
        ],
      },
    );

    expect(rows.shows).toMatchObject([
      { id: "published-show:published-show-1", displayTitle: "Shared Show", languages: ["da", "sv"] },
    ]);
    expect(rows.seasons).toMatchObject([
      {
        id: "published-season:published-season-1",
        showId: "published-show:published-show-1",
        seasonLabel: "S2",
      },
    ]);
    expect(rows.episodes).toMatchObject([
      {
        id: "published-episode:published-episode-1",
        seasonId: "published-season:published-season-1",
        episodeLabel: "E1",
      },
    ]);
  });
});

function showRow(id: string): CanonicalShowSeedRow {
  return {
    id,
    displayTitle: id,
    originalTitle: null,
    lifecycleStatus: "open",
    endedReason: null,
    languages: ["en"],
    countries: [],
    genreTags: [],
    externalLinks: [],
    notes: null,
  };
}

function seasonRow(id: string, showId: string): CanonicalSeasonSeedRow {
  return {
    id,
    showId,
    section: "current",
    seasonNumber: 1,
    seasonLabel: "S1",
    title: null,
    releaseKind: "season",
    isFinal: false,
    timing: "",
    releasePattern: null,
    releasePrecision: "unknown",
    dateConfidence: "unknown",
    releaseWindow: null,
    finaleWindow: null,
    sortKey: null,
    episodeCount: null,
    organizations: [],
    externalLinks: [],
    notes: null,
  };
}

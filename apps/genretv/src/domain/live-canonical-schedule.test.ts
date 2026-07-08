import { describe, expect, test } from "bun:test";

import { applyPersonalEpisodes, applyPersonalSeasons } from "./live-canonical-schedule";
import type { CanonicalEpisodeSeedRow, CanonicalSeasonSeedRow } from "./schedule";

describe("live canonical personal overlay rows", () => {
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
          seasonLabel: "S1",
          timing: "Fridays",
          endedReason: "Unknown",
          releasePattern: "weekly",
          releasePrecision: "day",
          dateConfidence: "confirmed",
          releaseWindow: { raw: "2026-07-08", precision: "day", confidence: "confirmed" },
          finaleWindow: null,
          sortKey: "002",
          episodeCount: null,
          sourceRow: 2,
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
        seasonLabel: "S1",
        timing: "Fridays",
        endedReason: "Unknown",
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
        sourceRow: 2,
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
});

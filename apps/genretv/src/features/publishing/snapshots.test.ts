import { describe, expect, test } from "bun:test";

import type { CanonicalSchedule } from "../../domain/schedule";
import { buildPublishedSnapshotPlan, normalizePublishedSlug } from "./snapshots";

const schedule: CanonicalSchedule = {
  title: "GenreTV test",
  sourceUrl: "https://example.test",
  updatedLabel: "Updated",
  generatedAt: "2026-07-08T00:00:00.000Z",
  counts: { current: 1, upcoming: 1, past: 0 },
  entries: [
    {
      id: "season-1",
      showId: "show-1",
      sourceRow: 2,
      section: "current",
      title: "Shared Show",
      originalTitle: null,
      seasonLabel: "S1",
      timing: "Fridays",
      endedReason: "Unknown",
      endingKind: "unknown",
      organizationText: "Netflix",
      organizations: ["Netflix"],
      genreText: "Fantasy",
      genres: ["Fantasy"],
      languages: ["en"],
      countries: ["US"],
      showLinks: [{ label: "IMDb", url: "https://imdb.test/title/1" }],
      links: [
        { label: "IMDb", url: "https://imdb.test/title/1" },
        { label: "Wikipedia", url: "https://wikipedia.test/season/1" },
      ],
      seasonLinks: [{ label: "Wikipedia", url: "https://wikipedia.test/season/1" }],
      notes: "Show note",
      seasonNotes: "Season note",
      releasePattern: "weekly",
      legacyCells: [],
      episodeCount: null,
      episodes: [
        {
          id: "episode-1",
          episodeLabel: "E1",
          title: "Pilot",
          releaseDate: "2026-07-08",
          notes: "Episode note",
          links: [],
        },
      ],
    },
    {
      id: "season-2",
      showId: "show-1",
      sourceRow: 3,
      section: "upcoming",
      title: "Shared Show",
      originalTitle: null,
      seasonLabel: "S2",
      timing: "2027",
      endedReason: "Unknown",
      endingKind: "unknown",
      organizationText: "Netflix",
      organizations: ["Netflix"],
      genreText: "Fantasy",
      genres: ["Fantasy"],
      languages: ["en"],
      countries: ["US"],
      showLinks: [],
      links: [],
      seasonLinks: [],
      notes: null,
      seasonNotes: null,
      releasePattern: null,
      legacyCells: [],
      episodeCount: 0,
      episodes: [],
    },
  ],
};

describe("published snapshot planning", () => {
  test("normalizes stable public slugs", () => {
    expect(normalizePublishedSlug("  Anton & Genre TV!  ")).toBe("anton-and-genre-tv");
    expect(normalizePublishedSlug("***")).toBe("");
  });

  test("deduplicates shows and snapshots seasons and episodes", () => {
    const ids = ["show-published", "season-published-1", "episode-published-1", "season-published-2"];
    const plan = buildPublishedSnapshotPlan(
      schedule,
      {
        listId: "list-1",
        slug: "anton-list",
        title: "Anton list",
        description: "Published",
        snapshotVersion: 2,
        nowUs: 1_725_000_000_000_000n,
      },
      () => ids.shift() ?? "extra-id",
    );

    expect(plan.list).toMatchObject({
      id: "list-1",
      publicationStatus: "published",
      publishedAtUs: 1_725_000_000_000_000n,
      snapshotVersion: 2,
      slug: "anton-list",
    });
    expect(plan.shows).toHaveLength(1);
    expect(plan.shows[0]).toMatchObject({
      id: "show-published",
      displayTitle: "Shared Show",
      canonicalShowId: null,
      sourcePersonalShowId: null,
      externalLinks: [{ label: "IMDb", url: "https://imdb.test/title/1" }],
    });
    expect(plan.seasons[0]?.externalLinks).toEqual([{ label: "Wikipedia", url: "https://wikipedia.test/season/1" }]);
    expect(plan.seasons.map((season) => [season.id, season.publishedShowId, season.snapshotVersion])).toEqual([
      ["season-published-1", "show-published", 2],
      ["season-published-2", "show-published", 2],
    ]);
    expect(plan.episodes[0]).toMatchObject({
      id: "episode-published-1",
      publishedSeasonId: "season-published-1",
      title: "Pilot",
      releaseWindow: { raw: "2026-07-08" },
    });
  });
});

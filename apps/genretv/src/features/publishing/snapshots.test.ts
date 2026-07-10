import { describe, expect, test } from "bun:test";

import type { CanonicalSchedule } from "../../domain/schedule";
import { buildPublishedSnapshotPlan, filteredPublishedSnapshotSchedule, normalizePublishedSlug } from "./snapshots";

const schedule: CanonicalSchedule = {
  title: "GenreTV test",
  sourceUrl: "https://example.test",
  updatedLabel: "Updated",
  generatedAt: "2026-07-08T00:00:00.000Z",
  counts: { current: 1, upcoming: 1, waiting: 0, past: 0 },
  allEntries: [],
  entries: [
    {
      id: "season-1",
      showId: "show-1",
      sourceRow: 2,
      section: "current",
      sourceSection: "current",
      title: "Shared Show",
      originalTitle: null,
      seasonNumber: 1,
      seasonLabel: "S1",
      customSeasonLabel: null,
      releaseTitle: null,
      releaseKind: "season",
      isFinal: false,
      officialSeasonCount: 2,
      specialCount: 0,
      movieCount: 0,
      timing: "Fridays",
      lifecycleStatus: "open",
      endedReason: null,
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
      releasePrecision: "day",
      dateConfidence: "confirmed",
      releaseWindow: {
        raw: "2026-07-08",
        precision: "day",
        confidence: "confirmed",
        year: 2026,
        month: 7,
        day: 8,
        releaseSeason: null,
      },
      finaleWindow: null,
      sortKey: "2026-07-08",
      legacyCells: [],
      episodeCount: null,
      episodes: [
        {
          id: "episode-1",
          episodeLabel: "E1",
          title: "Pilot",
          releaseDate: "2026-07-08",
          releaseWindow: {
            raw: "2026-07-08",
            precision: "day",
            confidence: "confirmed",
            year: 2026,
            month: 7,
            day: 8,
            releaseSeason: null,
          },
          sortKey: "001",
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
      sourceSection: "upcoming",
      title: "Shared Show",
      originalTitle: null,
      seasonNumber: 2,
      seasonLabel: "S2",
      customSeasonLabel: null,
      releaseTitle: null,
      releaseKind: "season",
      isFinal: false,
      officialSeasonCount: 2,
      specialCount: 0,
      movieCount: 0,
      timing: "2027",
      lifecycleStatus: "open",
      endedReason: null,
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
      releasePrecision: "unknown",
      dateConfidence: "unknown",
      releaseWindow: null,
      finaleWindow: null,
      sortKey: null,
      legacyCells: [],
      episodeCount: 0,
      episodes: [],
    },
  ],
};
schedule.allEntries = schedule.entries;

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
    expect(plan.seasons[0]).toMatchObject({
      releasePrecision: "day",
      dateConfidence: "confirmed",
      releaseWindow: { raw: "2026-07-08" },
      sortKey: "2026-07-08",
    });
    expect(plan.seasons.map((season) => [season.id, season.publishedShowId, season.snapshotVersion])).toEqual([
      ["season-published-1", "show-published", 2],
      ["season-published-2", "show-published", 2],
    ]);
    expect(plan.episodes[0]).toMatchObject({
      id: "episode-published-1",
      publishedSeasonId: "season-published-1",
      publicationStatus: "published",
      title: "Pilot",
      releaseWindow: { raw: "2026-07-08" },
      sortKey: "001",
    });
  });

  test("can stage a snapshot as draft before the final publish flip", () => {
    const ids = ["show-published", "season-published-1", "episode-published-1", "season-published-2"];
    const plan = buildPublishedSnapshotPlan(
      schedule,
      {
        listId: "list-1",
        slug: "anton-list",
        title: "Anton list",
        description: null,
        snapshotVersion: 3,
        nowUs: 1_725_000_000_000_000n,
      },
      () => ids.shift() ?? "extra-id",
      { publicationStatus: "draft" },
    );

    expect(plan.list.publicationStatus).toBe("draft");
    expect(plan.shows.every((show) => show.publicationStatus === "draft")).toBe(true);
    expect(plan.seasons.every((season) => season.publicationStatus === "draft")).toBe(true);
    expect(plan.episodes.every((episode) => episode.publicationStatus === "draft")).toBe(true);
  });

  test("persists the source section instead of a derived waiting section", () => {
    const waitingSchedule: CanonicalSchedule = {
      ...schedule,
      counts: { current: 0, upcoming: 0, waiting: 1, past: 0 },
      entries: [{ ...schedule.entries[0]!, section: "waiting", sourceSection: "current" }],
    };
    const plan = buildPublishedSnapshotPlan(
      waitingSchedule,
      {
        description: null,
        listId: "waiting-list",
        nowUs: 1n,
        slug: "waiting-list",
        snapshotVersion: 1,
        title: "Waiting list",
      },
      () => crypto.randomUUID(),
    );

    expect(plan.seasons[0]?.section).toBe("current");
  });

  test("filters a schedule into a published sub-list", () => {
    const filtered = filteredPublishedSnapshotSchedule(schedule, "S2");

    expect(filtered.entries.map((entry) => entry.id)).toEqual(["season-2"]);
    expect(filtered.counts).toEqual({ current: 0, upcoming: 1, waiting: 0, past: 0 });
    expect(schedule.entries).toHaveLength(2);
  });
});

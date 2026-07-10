import { describe, expect, test } from "bun:test";

import { buildPublishedListSummaries } from "./imports";
import { prerequisiteReleases } from "./use-import-published-season";

describe("published list import summaries", () => {
  test("uses only published current snapshot rows and marks imported seasons", () => {
    const summaries = buildPublishedListSummaries(
      [
        {
          id: "list-1",
          ownerId: "publisher-1",
          slug: "published",
          title: "Published list",
          description: "Public",
          publicationStatus: "published",
          snapshotVersion: 2,
          updatedAtUs: 10n,
        },
        {
          id: "draft-list",
          ownerId: "publisher-2",
          slug: "draft",
          title: "Draft list",
          description: null,
          publicationStatus: "draft",
          snapshotVersion: 1,
          updatedAtUs: 1n,
        },
      ],
      [
        {
          id: "show-current",
          publishedListId: "list-1",
          snapshotVersion: 2,
          displayTitle: "Shared Show",
          originalTitle: null,
          lifecycleStatus: "open",
          endedReason: null,
          languages: ["da", "sv"],
          countries: ["DK"],
          genreTags: ["Fantasy"],
          externalLinks: [{ label: "IMDb", url: "https://imdb.test/title/1" }],
          notes: "Show note",
        },
        {
          id: "show-stale",
          publishedListId: "list-1",
          snapshotVersion: 1,
          displayTitle: "Old Show",
          originalTitle: null,
          lifecycleStatus: "ended",
          endedReason: "Finished",
          languages: ["en"],
          countries: ["US"],
          genreTags: [],
          externalLinks: [],
          notes: null,
        },
      ],
      [
        {
          id: "season-current",
          publishedListId: "list-1",
          publishedShowId: "show-current",
          snapshotVersion: 2,
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
          notes: "Season note",
        },
        {
          id: "season-stale",
          publishedListId: "list-1",
          publishedShowId: "show-stale",
          snapshotVersion: 1,
          section: "past",
          seasonNumber: null,
          seasonLabel: "S0",
          title: null,
          releaseKind: "other",
          isFinal: false,
          timing: "",
          releasePattern: null,
          releasePrecision: "unknown",
          dateConfidence: "unknown",
          releaseWindow: null,
          finaleWindow: null,
          sortKey: "001",
          episodeCount: 8,
          organizations: [],
          externalLinks: [],
          notes: null,
        },
      ],
      [
        {
          id: "episode-current",
          publishedListId: "list-1",
          publishedSeasonId: "season-current",
          snapshotVersion: 2,
          canonicalEpisodeId: null,
          episodeLabel: "E1",
          title: "Pilot",
          releaseWindow: { raw: "2026-07-08", precision: "day", confidence: "confirmed" },
          sortKey: "001",
          externalLinks: [],
          notes: "Episode note",
        },
        {
          id: "episode-stale",
          publishedListId: "list-1",
          publishedSeasonId: "season-current",
          snapshotVersion: 1,
          canonicalEpisodeId: null,
          episodeLabel: "E0",
          title: "Old pilot",
          releaseWindow: null,
          sortKey: "000",
          externalLinks: [],
          notes: null,
        },
      ],
      [{ id: "import-current", sourcePublishedSeasonId: "season-current", importMode: "linked" }],
      [{ ownerId: "publisher-1", displayName: "Curator One", publicSlug: "curator-one" }],
    );

    const first = summaries[0]!.seasons[0]!;
    const second = { ...first, id: "season-2", seasonNumber: 2, seasonLabel: "S2" };
    const third = { ...first, id: "season-3", seasonNumber: 3, seasonLabel: "S3" };
    expect(prerequisiteReleases(third, [third, first, second]).map((release) => release.id)).toEqual([
      "season-current",
      "season-2",
      "season-3",
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: "list-1",
      title: "Published list",
      ownerId: "publisher-1",
      publisherDisplayName: "Curator One",
      publisherSlug: "curator-one",
      snapshotVersion: 2,
    });
    expect(summaries[0]?.seasons).toHaveLength(1);
    expect(summaries[0]?.seasons[0]).toMatchObject({
      id: "season-current",
      displayTitle: "Shared Show",
      languages: ["da", "sv"],
      showNotes: "Show note",
      notes: "Season note",
      organizationText: "Netflix",
      organizationSeeds: [{ name: "Netflix", role: "streamer", externalLinks: [] }],
      seasonExternalLinks: [{ label: "Wikipedia", url: "https://wikipedia.test/shared-show" }],
      releaseWindow: { raw: "2026-07-08", precision: "day", confidence: "confirmed" },
      sortKey: "002",
      episodes: [{ id: "episode-current", episodeLabel: "E1", title: "Pilot", notes: "Episode note" }],
      importMode: "linked",
    });
  });
});

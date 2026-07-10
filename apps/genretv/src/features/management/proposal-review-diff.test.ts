import { describe, expect, test } from "bun:test";

import type { ManagementShow } from "../../domain/schedule";
import { proposalReviewDiffRows } from "./proposal-review-diff";

describe("proposal review diffs", () => {
  test("compares a season proposal with the current canonical season", () => {
    const rows = proposalReviewDiffRows(
      {
        canonicalEpisodeId: null,
        canonicalSeasonId: "season-1",
        canonicalShowId: "show-1",
        proposalKind: "season",
        proposedPayload: {
          kind: "season",
          showTitle: "Alien: Earth",
          seasonLabel: "S2",
          section: "current",
          timing: "Fridays",
          episodeCount: 8,
          organizations: [{ name: "FX", role: "unknown", externalLinks: [] }],
        },
      },
      [managementShow()],
    );

    expect(rows).toContainEqual({ current: "Upcoming", field: "When", proposed: "Fridays", status: "changed" });
    expect(rows).toContainEqual({ current: "6", field: "Episodes", proposed: "8", status: "changed" });
    expect(rows).toContainEqual({ current: "FX", field: "Organizations", proposed: "FX", status: "unchanged" });
  });

  test("marks proposal rows as new when there is no canonical target", () => {
    const rows = proposalReviewDiffRows(
      {
        canonicalEpisodeId: null,
        canonicalSeasonId: null,
        canonicalShowId: null,
        proposalKind: "show",
        proposedPayload: {
          kind: "show",
          displayTitle: "New E2E Show",
          languages: ["en"],
          countries: ["US"],
        },
      },
      [],
    );

    expect(rows).toContainEqual({ current: "New", field: "Title", proposed: "New E2E Show", status: "new" });
    expect(rows).toContainEqual({ current: "New", field: "Languages", proposed: "en", status: "new" });
  });
});

function managementShow(): ManagementShow {
  return {
    countries: ["US"],
    genres: ["science fiction"],
    id: "show-1",
    knownSeasonCount: 2,
    languages: ["en"],
    links: [],
    listedSeasonCount: 1,
    notes: null,
    organizations: ["FX"],
    originalTitle: null,
    seasons: [
      {
        countries: ["US"],
        dateConfidence: "expected",
        endedReason: "",
        episodeCount: 6,
        episodes: [],
        genreText: "science fiction",
        id: "season-1",
        languages: ["en"],
        links: [],
        notes: null,
        organizationText: "FX",
        organizations: ["FX"],
        releasePattern: null,
        releasePrecision: "year",
        releaseWindow: {
          confidence: "expected",
          day: null,
          month: null,
          precision: "year",
          raw: "2026",
          releaseSeason: null,
          year: 2026,
        },
        finaleWindow: null,
        seasonLabel: "S2",
        scheduleSection: "upcoming",
        section: "upcoming",
        sortKey: null,
        sourceRow: 1,
        timing: "Upcoming",
      },
    ],
    title: "Alien: Earth",
  };
}

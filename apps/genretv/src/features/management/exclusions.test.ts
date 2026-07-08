import { describe, expect, test } from "bun:test";

import { buildExclusionSummaries } from "./exclusions";

describe("management exclusion summaries", () => {
  test("labels hidden rows from canonical show, season, and episode data", () => {
    const summaries = buildExclusionSummaries(
      [
        {
          id: "hide-season",
          excludedKind: "season",
          canonicalShowId: "show-1",
          canonicalSeasonId: "season-1",
          canonicalEpisodeId: null,
          reason: null,
        },
        {
          id: "hide-show",
          excludedKind: "show",
          canonicalShowId: "show-2",
          canonicalSeasonId: null,
          canonicalEpisodeId: null,
          reason: "Not interested",
        },
        {
          id: "hide-episode",
          excludedKind: "episode",
          canonicalShowId: "show-1",
          canonicalSeasonId: "season-1",
          canonicalEpisodeId: "episode-1",
          reason: null,
        },
      ],
      [
        { id: "show-1", displayTitle: "Shared Show" },
        { id: "show-2", displayTitle: "Other Show" },
      ],
      [{ id: "season-1", showId: "show-1", seasonLabel: "S1" }],
      [{ id: "episode-1", seasonId: "season-1", episodeLabel: "E1", title: "Pilot" }],
    );

    expect(summaries.map((summary) => [summary.id, summary.kind, summary.label])).toEqual([
      ["hide-show", "show", "Other Show"],
      ["hide-episode", "episode", "Shared Show · S1 · E1 · Pilot"],
      ["hide-season", "season", "Shared Show S1"],
    ]);
  });
});

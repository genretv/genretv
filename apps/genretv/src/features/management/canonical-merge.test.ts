import { describe, expect, test } from "bun:test";

import { buildCanonicalProposalMergePlan } from "./canonical-merge";

describe("canonical proposal merge planning", () => {
  test("creates a new canonical show from a show proposal", () => {
    const ids = idSequence("show-new", "season-new");
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "show",
        canonicalEpisodeId: null,
        canonicalShowId: null,
        canonicalSeasonId: null,
        title: "New Show",
        proposedPayload: {
          displayTitle: "New Show",
          originalTitle: "Original",
          languages: ["English", "Danish"],
          countries: ["US"],
          genreTags: ["science fiction"],
          notes: "Worth adding",
        },
      },
      ids,
    );

    expect(plan.showCreate).toMatchObject({
      id: "show-new",
      displayTitle: "New Show",
      originalTitle: "Original",
      languages: ["English", "Danish"],
      countries: ["US"],
      genreTags: ["science fiction"],
      notes: "Worth adding",
    });
    expect(plan.showUpdate).toBeNull();
    expect(plan.seasonCreate).toMatchObject({
      id: "season-new",
      showId: "show-new",
      seasonNumber: 1,
      releaseKind: "season",
    });
  });

  test("updates an existing canonical show from a show proposal", () => {
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "show",
        canonicalEpisodeId: null,
        canonicalShowId: "show-1",
        canonicalSeasonId: null,
        title: "Fallback",
        proposedPayload: { displayTitle: "Better Title" },
      },
      () => "unused",
    );

    expect(plan.showCreate).toBeNull();
    expect(plan.showUpdate).toEqual({
      id: "show-1",
      patch: {
        displayTitle: "Better Title",
        originalTitle: null,
        lifecycleStatus: "open",
        endedReason: null,
        languages: [],
        countries: [],
        genreTags: [],
        externalLinks: [],
        notes: null,
      },
    });
  });

  test("creates a parent show when approving a season proposal without a canonical show", () => {
    const ids = idSequence("show-new", "season-new");
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "season",
        canonicalEpisodeId: null,
        canonicalShowId: null,
        canonicalSeasonId: null,
        title: "Show Season 1",
        proposedPayload: {
          showTitle: "Show",
          section: "current",
          seasonNumber: 1,
          seasonLabel: "Season 1",
          releaseKind: "season",
          timing: "Fridays",
          episodeCount: 8,
        },
      },
      ids,
    );

    expect(plan.showCreate).toMatchObject({ id: "show-new", displayTitle: "Show" });
    expect(plan.seasonCreate).toMatchObject({
      id: "season-new",
      showId: "show-new",
      section: "current",
      seasonLabel: "Season 1",
      timing: "Fridays",
      episodeCount: 8,
      sourceRow: 1_000_000,
    });
  });

  test("updates an existing canonical season", () => {
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "season",
        canonicalEpisodeId: null,
        canonicalShowId: "show-1",
        canonicalSeasonId: "season-1",
        title: "Show Season 2",
        proposedPayload: {
          seasonLabel: "Season 2",
          seasonNumber: 2,
          releaseKind: "season",
          isFinal: true,
          section: "past",
          releasePattern: "weekly",
          releasePrecision: "season",
          dateConfidence: "expected",
          releaseWindow: { raw: "Spring 2027", precision: "season", confidence: "expected" },
          finaleWindow: { raw: "Summer 2027", precision: "season", confidence: "expected" },
          sortKey: "2027-04",
        },
      },
      () => "unused",
    );

    expect(plan.showCreate).toBeNull();
    expect(plan.seasonCreate).toBeNull();
    expect(plan.seasonUpdate).toMatchObject({
      id: "season-1",
      patch: {
        showId: "show-1",
        section: "past",
        seasonLabel: "Season 2",
        seasonNumber: 2,
        releaseKind: "season",
        isFinal: true,
        releasePattern: "weekly",
        releasePrecision: "season",
        dateConfidence: "expected",
        releaseWindow: { raw: "Spring 2027", precision: "season", confidence: "expected" },
        finaleWindow: { raw: "Summer 2027", precision: "season", confidence: "expected" },
        sortKey: "2027-04",
      },
    });
  });

  test("updates an existing canonical episode", () => {
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "episode",
        canonicalEpisodeId: "episode-1",
        canonicalShowId: "show-1",
        canonicalSeasonId: "season-1",
        title: "Show S1E2",
        proposedPayload: {
          episodeLabel: "2",
          title: "Better Episode",
          releaseWindow: { date: "2026-07-08" },
          sortKey: "002",
          notes: "Corrected title",
        },
      },
      () => "unused",
    );

    expect(plan.showCreate).toBeNull();
    expect(plan.seasonCreate).toBeNull();
    expect(plan.episodeCreate).toBeNull();
    expect(plan.episodeUpdate).toEqual({
      id: "episode-1",
      patch: {
        seasonId: "season-1",
        episodeLabel: "2",
        title: "Better Episode",
        releaseWindow: { date: "2026-07-08" },
        sortKey: "002",
        externalLinks: [],
        notes: "Corrected title",
      },
    });
  });

  test("creates a canonical episode under an existing season", () => {
    const ids = idSequence("episode-new");
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "episode",
        canonicalEpisodeId: null,
        canonicalShowId: "show-1",
        canonicalSeasonId: "season-1",
        title: "Show S1E3",
        proposedPayload: {
          episodeLabel: "3",
          title: "New Episode",
        },
      },
      ids,
    );

    expect(plan.showCreate).toBeNull();
    expect(plan.seasonCreate).toBeNull();
    expect(plan.episodeCreate).toMatchObject({
      id: "episode-new",
      seasonId: "season-1",
      episodeLabel: "3",
      title: "New Episode",
    });
  });

  test("creates parent canonical show and season for a standalone episode proposal", () => {
    const ids = idSequence("show-new", "season-new", "episode-new");
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "episode",
        canonicalEpisodeId: null,
        canonicalShowId: null,
        canonicalSeasonId: null,
        title: "New Show Season 1 Episode 1",
        proposedPayload: {
          showTitle: "New Show",
          seasonLabel: "Season 1",
          seasonNumber: 1,
          releaseKind: "season",
          section: "current",
          timing: "Mondays",
          releasePrecision: "season",
          dateConfidence: "expected",
          seasonReleaseWindow: { raw: "Spring 2027", precision: "season", confidence: "expected" },
          finaleWindow: { raw: "Summer 2027", precision: "season", confidence: "expected" },
          seasonSortKey: "2027-04",
          seasonEpisodeCount: 6,
          organizations: [{ name: "Netflix", role: "unknown", externalLinks: [] }],
          seasonExternalLinks: [{ label: "Wikipedia", url: "https://wikipedia.test/show" }],
          seasonNotes: "Parent note",
          episodeLabel: "1",
          title: "Pilot",
          releaseWindow: { raw: "2027-04-01", precision: "day", confidence: "confirmed" },
        },
      },
      ids,
    );

    expect(plan.showCreate).toMatchObject({ id: "show-new", displayTitle: "New Show" });
    expect(plan.seasonCreate).toMatchObject({
      id: "season-new",
      showId: "show-new",
      section: "current",
      seasonLabel: "Season 1",
      seasonNumber: 1,
      releaseKind: "season",
      timing: "Mondays",
      releasePrecision: "season",
      dateConfidence: "expected",
      releaseWindow: { raw: "Spring 2027", precision: "season", confidence: "expected" },
      finaleWindow: { raw: "Summer 2027", precision: "season", confidence: "expected" },
      sortKey: "2027-04",
      episodeCount: 6,
      organizations: [{ name: "Netflix", role: "unknown", externalLinks: [] }],
      externalLinks: [{ label: "Wikipedia", url: "https://wikipedia.test/show" }],
      notes: "Parent note",
      sourceRow: 1_000_000,
    });
    expect(plan.episodeCreate).toMatchObject({
      id: "episode-new",
      seasonId: "season-new",
      episodeLabel: "1",
      title: "Pilot",
      releaseWindow: { raw: "2027-04-01", precision: "day", confidence: "confirmed" },
    });
  });
});

function idSequence(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? "missing";
}

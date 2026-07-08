import { describe, expect, test } from "bun:test";

import { buildCanonicalProposalMergePlan } from "./canonical-merge";

describe("canonical proposal merge planning", () => {
  test("creates a new canonical show from a show proposal", () => {
    const ids = idSequence("show-new");
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "show",
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
  });

  test("updates an existing canonical show from a show proposal", () => {
    const plan = buildCanonicalProposalMergePlan(
      {
        proposalKind: "show",
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
        canonicalShowId: null,
        canonicalSeasonId: null,
        title: "Show Season 1",
        proposedPayload: {
          showTitle: "Show",
          section: "current",
          seasonLabel: "Season 1",
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
        canonicalShowId: "show-1",
        canonicalSeasonId: "season-1",
        title: "Show Season 2",
        proposedPayload: {
          seasonLabel: "Season 2",
          section: "past",
          endedReason: "finished",
          releasePattern: "weekly",
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
        endedReason: "finished",
        releasePattern: "weekly",
      },
    });
  });
});

function idSequence(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? "missing";
}

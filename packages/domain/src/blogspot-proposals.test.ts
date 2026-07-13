import { describe, expect, test } from "bun:test";

import { planBlogspotCanonicalProposals } from "./blogspot-proposals";
import type { CanonicalRegistrySeedRows, CanonicalSeasonSeedRow, CanonicalShowSeedRow } from "./canonical-seed";

const source = {
  kind: "blogspot" as const,
  url: "https://genretv.blogspot.com/",
  observedAtUs: 1_000_000n,
};

describe("Blogspot canonical proposal planning", () => {
  test("matches a renamed show by IMDb and proposes only meaningful changed fields", () => {
    const scraped = show({
      id: "scraped-id",
      displayTitle: "New display title",
      externalLinks: [{ kind: "imdb", label: "IMDb", url: "https://www.imdb.com/title/tt1234567/" }],
      countries: [],
    });
    const canonical = show({
      id: "canonical-id",
      displayTitle: "Old display title",
      externalLinks: [{ kind: "imdb", label: "IMDb", url: "https://www.imdb.com/title/tt1234567/" }],
      countries: ["NZ"],
    });

    const plan = planBlogspotCanonicalProposals({
      source,
      sourceRows: rows([scraped]),
      canonical: { shows: [canonical], seasons: [] },
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0]).toMatchObject({
      proposalKind: "show",
      canonicalShowId: "canonical-id",
      proposedPayload: { displayTitle: "New display title" },
    });
    expect(plan.proposals[0]?.proposedPayload).not.toHaveProperty("countries");
  });

  test("defers release rows until a new show proposal has been accepted", () => {
    const scrapedShow = show({ id: "new-show", displayTitle: "Brand New Show" });
    const scrapedSeason = season({ id: "new-season", showId: scrapedShow.id, seasonNumber: 1 });

    const plan = planBlogspotCanonicalProposals({
      source,
      sourceRows: rows([scrapedShow], [scrapedSeason]),
      canonical: { shows: [], seasons: [] },
    });

    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0]).toMatchObject({
      proposalKind: "show",
      canonicalShowId: null,
      proposedPayload: { createInitialSeason: false },
    });
    expect(plan.issues).toContainEqual({
      code: "deferred-season",
      sourceId: "new-season",
      detail: "Brand New Show must be accepted before its release rows can be proposed",
    });
  });

  test("refuses an ambiguous title match", () => {
    const scraped = show({ id: "source", displayTitle: "The Returned" });
    const plan = planBlogspotCanonicalProposals({
      source,
      sourceRows: rows([scraped]),
      canonical: {
        shows: [show({ id: "one", displayTitle: "The Returned" }), show({ id: "two", displayTitle: "The Returned" })],
        seasons: [],
      },
    });

    expect(plan.proposals).toHaveLength(0);
    expect(plan.issues[0]?.code).toBe("ambiguous-show");
  });

  test("matches numbered seasons under the resolved show and skips an existing fingerprint", () => {
    const scrapedShow = show({ id: "show-1", displayTitle: "Example" });
    const scrapedSeason = season({ id: "scraped-season", showId: "show-1", seasonNumber: 2, timing: "Sundays" });
    const canonicalSeason = season({ id: "canonical-season", showId: "show-1", seasonNumber: 2, timing: "Mondays" });
    const first = planBlogspotCanonicalProposals({
      source,
      sourceRows: rows([scrapedShow], [scrapedSeason]),
      canonical: { shows: [scrapedShow], seasons: [canonicalSeason] },
    });
    const fingerprint = first.proposals[0]?.fingerprint;
    expect(fingerprint).toBeString();

    const repeated = planBlogspotCanonicalProposals({
      source,
      sourceRows: rows([scrapedShow], [scrapedSeason]),
      canonical: { shows: [scrapedShow], seasons: [canonicalSeason] },
      existingFingerprints: new Set([fingerprint!]),
    });

    expect(repeated.proposals).toHaveLength(0);
    expect(repeated.skippedDuplicateCount).toBe(1);
  });
});

function rows(shows: CanonicalShowSeedRow[], seasons: CanonicalSeasonSeedRow[] = []): CanonicalRegistrySeedRows {
  return { shows, seasons, episodes: [] };
}

function show(overrides: Partial<CanonicalShowSeedRow>): CanonicalShowSeedRow {
  return {
    id: "show",
    displayTitle: "Show",
    originalTitle: null,
    lifecycleStatus: "open",
    endedReason: null,
    languages: ["en"],
    countries: [],
    genreTags: ["Science fiction"],
    externalLinks: [],
    notes: null,
    ...overrides,
  };
}

function season(overrides: Partial<CanonicalSeasonSeedRow>): CanonicalSeasonSeedRow {
  return {
    id: "season",
    showId: "show",
    section: "upcoming",
    seasonNumber: 1,
    seasonLabel: null,
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
    ...overrides,
  };
}

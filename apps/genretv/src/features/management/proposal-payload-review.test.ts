import { describe, expect, test } from "bun:test";

import { buildReviewedPayload, payloadRecord } from "./proposal-payload-review";

describe("proposal payload review", () => {
  test("keeps only accepted fields and parses structured modifications", () => {
    const result = buildReviewedPayload(
      { title: "Old", languages: ["en"], episodeCount: 8 },
      new Set(["title", "languages"]),
      { title: "Maintainer title", languages: '["en", "fr"]', episodeCount: "10" },
    );

    expect(result).toEqual({
      valid: true,
      payload: { title: "Maintainer title", languages: ["en", "fr"] },
    });
  });

  test("marks empty selections and malformed values invalid", () => {
    expect(buildReviewedPayload({ title: "Old" }, new Set(), {})).toMatchObject({ valid: false });
    expect(
      buildReviewedPayload({ releaseWindow: { raw: "2027" } }, new Set(["releaseWindow"]), {
        releaseWindow: "{",
      }),
    ).toMatchObject({ valid: false });
  });

  test("does not expose importer merge instructions as accepted data", () => {
    expect(payloadRecord({ displayTitle: "Show", createInitialSeason: false })).toEqual({
      displayTitle: "Show",
    });
  });
});

import { describe, expect, test } from "bun:test";

import { assertCanonicalBaseline, parseCommandOptions } from "./propose-blogspot-updates";

describe("Blogspot proposal command", () => {
  test("is a dry run by default", () => {
    expect(parseCommandOptions([])).toMatchObject({
      input: null,
      submit: false,
      sourceUrl: "https://genretv.blogspot.com/",
    });
  });

  test("accepts explicit submission and a saved source page", () => {
    expect(parseCommandOptions(["--submit", "--source", "tmp/agents/page.html", "--json"])).toMatchObject({
      input: "tmp/agents/page.html",
      submit: true,
      json: true,
    });
  });

  test("refuses to propose every source row against an empty canonical baseline", () => {
    expect(() =>
      assertCanonicalBaseline({
        canonicalShowCount: 0,
        canonicalSeasonCount: 0,
        sourceShowCount: 764,
        sourceSeasonCount: 1663,
      }),
    ).toThrow("synchronized canonical baseline is empty (0 Shows, 0 Seasons)");
  });

  test("accepts a populated canonical baseline", () => {
    expect(() =>
      assertCanonicalBaseline({
        canonicalShowCount: 764,
        canonicalSeasonCount: 1663,
        sourceShowCount: 764,
        sourceSeasonCount: 1663,
      }),
    ).not.toThrow();
  });
});

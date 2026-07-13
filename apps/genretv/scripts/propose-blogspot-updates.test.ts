import { describe, expect, test } from "bun:test";

import { parseCommandOptions } from "./propose-blogspot-updates";

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
});

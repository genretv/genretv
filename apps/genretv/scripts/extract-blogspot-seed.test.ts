import { describe, expect, test } from "bun:test";

import { parseReleaseWindow } from "./extract-blogspot-seed";

describe("Blogspot release-window parsing", () => {
  test("parses a dotted month-day-year date", () => {
    expect(parseReleaseWindow("Jan.26. 2020")).toEqual({
      raw: "Jan.26. 2020",
      precision: "date",
      confidence: "confirmed",
      year: 2020,
      month: 1,
      day: 26,
      releaseSeason: null,
    });
  });

  test("keeps a final-season marker separate from a yearless date", () => {
    expect(parseReleaseWindow("Jun.21 (f)")).toEqual({
      raw: "Jun.21 (f)",
      precision: "month_day",
      confidence: "confirmed",
      year: null,
      month: 6,
      day: 21,
      releaseSeason: null,
    });
  });
});

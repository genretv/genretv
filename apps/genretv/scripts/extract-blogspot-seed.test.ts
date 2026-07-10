import { describe, expect, test } from "bun:test";

import { parseReleaseWindow, parseSeed } from "./extract-blogspot-seed";

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

  test("defaults Netflix releases to bulk unless they have a finale date", () => {
    const html = `
      <title>GenreTV fixture</title>
      <strong>Updated Jun.17, 2026:</strong>
      <table><tbody>
        <tr><td><strong>Upcoming Shows</strong></td></tr>
        <tr><td>Bulk Show</td><td>Jun.25</td><td>Netflix</td><td>Fantasy</td><td>2</td><td></td></tr>
        <tr><td>Weekly Show</td><td>Aug.5</td><td>Netflix</td><td>Fantasy</td><td>1</td><td>Aug.26</td></tr>
      </tbody></table>
    `;

    expect(parseSeed(html, "fixture.html").entries.map((entry) => entry.season.releasePattern)).toEqual([
      "bulk",
      "weekly",
    ]);
  });
});

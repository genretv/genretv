import { describe, expect, test } from "bun:test";

import {
  emptyEpisodeDraft,
  orderedTextToList,
  organizationRowsToText,
  organizationTextToRows,
  parseEpisodeCountDraft,
  releaseDateDraftToWindow,
} from "./drafts";

describe("management draft helpers", () => {
  test("parses ordered list drafts while preserving first occurrence", () => {
    expect(orderedTextToList("da\nsv, en\nsv\n")).toEqual(["da", "sv", "en"]);
  });

  test("round-trips organization drafts through existing row shape", () => {
    expect(
      organizationRowsToText([
        { name: "BBC", role: "studio" },
        { name: "Netflix", role: "streamer" },
      ]),
    ).toBe("BBC\nNetflix");
    expect(organizationTextToRows("BBC\nNetflix\nBBC")).toEqual([
      { name: "BBC", role: "unknown", externalLinks: [] },
      { name: "Netflix", role: "unknown", externalLinks: [] },
    ]);
  });

  test("parses unknown and zero episode counts", () => {
    expect(parseEpisodeCountDraft("")).toBeNull();
    expect(parseEpisodeCountDraft("0")).toBe(0);
    expect(parseEpisodeCountDraft("12")).toBe(12);
    expect(parseEpisodeCountDraft("-1")).toBeNull();
    expect(parseEpisodeCountDraft("1.5")).toBeNull();
  });

  test("creates blank episode drafts and conservative release windows", () => {
    expect(emptyEpisodeDraft()).toEqual({
      episodeLabel: "",
      title: "",
      releaseDate: "",
      sortKey: "",
      notes: "",
    });
    expect(releaseDateDraftToWindow("")).toBeNull();
    expect(releaseDateDraftToWindow(" 2026-07-08 ")).toEqual({
      raw: "2026-07-08",
      precision: "unknown",
      confidence: "unknown",
    });
  });
});

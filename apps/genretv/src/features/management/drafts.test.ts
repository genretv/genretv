import { describe, expect, test } from "bun:test";

import {
  emptyEpisodeDraft,
  externalLinksToText,
  externalLinkTextToRows,
  orderedTextToList,
  organizationRowsToText,
  organizationTextToRows,
  parseEpisodeCountDraft,
  releaseDateDraftToWindow,
  releaseWindowDraftToWindow,
  releaseWindowText,
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

  test("round-trips external link drafts through existing row shape", () => {
    expect(
      externalLinksToText([
        { kind: "imdb", label: "IMDb", url: "https://imdb.example/title" },
        { label: "Wikipedia", url: "https://wikipedia.example/wiki/Show" },
      ]),
    ).toBe("imdb | IMDb | https://imdb.example/title\nWikipedia | https://wikipedia.example/wiki/Show");
    expect(externalLinkTextToRows("imdb | IMDb | https://imdb.example/title\nhttps://example.com")).toEqual([
      { kind: "imdb", label: "IMDb", url: "https://imdb.example/title" },
      { label: "https://example.com", url: "https://example.com" },
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
      linksText: "",
      notes: "",
    });
    expect(releaseDateDraftToWindow("")).toBeNull();
    expect(releaseDateDraftToWindow(" 2026-07-08 ")).toEqual({
      raw: "2026-07-08",
      precision: "unknown",
      confidence: "unknown",
    });
  });

  test("round-trips raw release window text with explicit metadata", () => {
    expect(releaseWindowText(null)).toBe("");
    expect(releaseWindowText({ raw: "Summer 2027", precision: "season" })).toBe("Summer 2027");
    expect(releaseWindowDraftToWindow(" Summer 2027 ", "season", "expected")).toEqual({
      raw: "Summer 2027",
      precision: "season",
      confidence: "expected",
    });
    expect(releaseWindowDraftToWindow("", "season", "expected")).toBeNull();
  });
});

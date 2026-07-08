import { describe, expect, test } from "bun:test";

import { orderedTextToList, parseEpisodeCountDraft } from "./drafts";

describe("management draft helpers", () => {
  test("parses ordered list drafts while preserving first occurrence", () => {
    expect(orderedTextToList("da\nsv, en\nsv\n")).toEqual(["da", "sv", "en"]);
  });

  test("parses unknown and zero episode counts", () => {
    expect(parseEpisodeCountDraft("")).toBeNull();
    expect(parseEpisodeCountDraft("0")).toBe(0);
    expect(parseEpisodeCountDraft("12")).toBe(12);
    expect(parseEpisodeCountDraft("-1")).toBeNull();
    expect(parseEpisodeCountDraft("1.5")).toBeNull();
  });
});

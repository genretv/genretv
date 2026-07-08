import { describe, expect, test } from "bun:test";

import {
  isLinkedPublishedShowId,
  linkedPublishedEpisodeId,
  linkedPublishedSeasonId,
  linkedPublishedShowId,
  sourcePublishedSeasonIdFromLinkedId,
} from "./linked-imports";

describe("linked published import ids", () => {
  test("creates local ids that preserve the source published id", () => {
    expect(linkedPublishedShowId("show-1")).toBe("published-show:show-1");
    expect(linkedPublishedSeasonId("season-1")).toBe("published-season:season-1");
    expect(linkedPublishedEpisodeId("episode-1")).toBe("published-episode:episode-1");
    expect(isLinkedPublishedShowId("published-show:show-1")).toBe(true);
    expect(isLinkedPublishedShowId("show-1")).toBe(false);
    expect(sourcePublishedSeasonIdFromLinkedId("published-season:season-1")).toBe("season-1");
    expect(sourcePublishedSeasonIdFromLinkedId("season-1")).toBeNull();
  });
});

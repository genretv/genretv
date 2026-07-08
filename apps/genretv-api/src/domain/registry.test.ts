import { describe, expect, test } from "bun:test";

import { genretvSyncRegistry } from "./registry";

describe("genretv sync registry", () => {
  test("declares the public canonical schedule shapes", () => {
    expect(Object.keys(genretvSyncRegistry).sort()).toEqual([
      "canonical_episode",
      "canonical_season",
      "canonical_show",
    ]);
    expect(genretvSyncRegistry.canonical_episode.mode).toBe("readonly");
    expect(genretvSyncRegistry.canonical_show.mode).toBe("readonly");
    expect(genretvSyncRegistry.canonical_season.mode).toBe("readonly");
    expect(genretvSyncRegistry.canonical_episode.consistencyGroup).toBe("canonical-schedule");
    expect(genretvSyncRegistry.canonical_season.consistencyGroup).toBe("canonical-schedule");
  });
});

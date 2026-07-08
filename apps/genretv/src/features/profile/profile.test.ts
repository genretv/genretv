import { describe, expect, test } from "bun:test";

import { defaultDisplayName, normalizeProfileSlug, profilePatchFromDraft } from "./profile";

describe("profile helpers", () => {
  test("derives a conservative default display name from email", () => {
    expect(defaultDisplayName("anton@example.test")).toBe("anton");
    expect(defaultDisplayName("")).toBe("GenreTV user");
    expect(defaultDisplayName(null)).toBe("GenreTV user");
  });

  test("normalizes public profile slugs", () => {
    expect(normalizeProfileSlug("  Anton & Genre TV!  ")).toBe("anton-and-genre-tv");
    expect(normalizeProfileSlug("***")).toBe("");
  });

  test("builds nullable profile patches from drafts", () => {
    expect(
      profilePatchFromDraft(
        {
          displayName: "  ",
          publicSlug: " *** ",
          bio: "  ",
          isPublic: false,
        },
        "fallback",
      ),
    ).toEqual({
      displayName: "fallback",
      publicSlug: null,
      bio: null,
      isPublic: false,
    });
  });
});

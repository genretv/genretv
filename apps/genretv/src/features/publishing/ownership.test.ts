import { describe, expect, test } from "bun:test";

import { ownPublishedLists, publishedSlugTakenByAnother } from "./ownership";

describe("published list ownership helpers", () => {
  const rows = [
    { id: "mine", ownerId: "user-1", slug: "mine" },
    { id: "theirs", ownerId: "user-2", slug: "theirs" },
  ];

  test("returns only the current user's published lists", () => {
    expect(ownPublishedLists(rows, "user-1").map((row) => row.id)).toEqual(["mine"]);
    expect(ownPublishedLists(rows, null)).toEqual([]);
  });

  test("detects slug collisions against other owners", () => {
    expect(publishedSlugTakenByAnother(rows, "mine", "user-1")).toBe(false);
    expect(publishedSlugTakenByAnother(rows, "theirs", "user-1")).toBe(true);
    expect(publishedSlugTakenByAnother(rows, "", "user-1")).toBe(false);
  });
});

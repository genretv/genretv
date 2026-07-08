import { describe, expect, test } from "bun:test";

import { canSendCanonicalProposal } from "./proposals";

describe("management canonical proposal permissions", () => {
  test("allows publishers and canonical maintainers to send proposals", () => {
    expect(canSendCanonicalProposal(["publisher"])).toBe(true);
    expect(canSendCanonicalProposal(["canonical_maintainer"])).toBe(true);
    expect(canSendCanonicalProposal(["user"])).toBe(false);
  });
});

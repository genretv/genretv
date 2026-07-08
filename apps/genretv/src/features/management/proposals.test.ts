import { describe, expect, test } from "bun:test";

import {
  canPublishList,
  canSendCanonicalProposal,
  hasApprovedPublishApplication,
  hasOpenPublishApplication,
  workflowStatusColor,
} from "./proposals";

describe("management canonical proposal permissions", () => {
  test("allows publishers and canonical maintainers to send proposals", () => {
    expect(canSendCanonicalProposal(["publisher"])).toBe(true);
    expect(canSendCanonicalProposal(["canonical_maintainer"])).toBe(true);
    expect(canSendCanonicalProposal(["user"])).toBe(false);
  });

  test("allows publishers and canonical maintainers to publish lists", () => {
    expect(canPublishList(["publisher"])).toBe(true);
    expect(canPublishList(["canonical_maintainer"])).toBe(true);
    expect(canPublishList(["user"])).toBe(false);
  });

  test("maps workflow statuses to stable badge colors", () => {
    expect(workflowStatusColor("approved")).toBe("teal");
    expect(workflowStatusColor("rejected")).toBe("red");
    expect(workflowStatusColor("closed")).toBe("gray");
    expect(workflowStatusColor("read")).toBe("gray");
    expect(workflowStatusColor("open")).toBe("yellow");
  });

  test("detects publish application workflow states", () => {
    expect(hasApprovedPublishApplication([{ status: "open" }])).toBe(false);
    expect(hasApprovedPublishApplication([{ status: "rejected" }, { status: "approved" }])).toBe(true);
    expect(hasOpenPublishApplication([{ status: "approved" }])).toBe(false);
    expect(hasOpenPublishApplication([{ status: "open" }, { status: "rejected" }])).toBe(true);
  });
});

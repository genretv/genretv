import { describe, expect, test } from "bun:test";

import { canSendCanonicalProposal, workflowStatusColor } from "./proposals";

describe("management canonical proposal permissions", () => {
  test("allows publishers and canonical maintainers to send proposals", () => {
    expect(canSendCanonicalProposal(["publisher"])).toBe(true);
    expect(canSendCanonicalProposal(["canonical_maintainer"])).toBe(true);
    expect(canSendCanonicalProposal(["user"])).toBe(false);
  });

  test("maps workflow statuses to stable badge colors", () => {
    expect(workflowStatusColor("approved")).toBe("teal");
    expect(workflowStatusColor("rejected")).toBe("red");
    expect(workflowStatusColor("closed")).toBe("gray");
    expect(workflowStatusColor("read")).toBe("gray");
    expect(workflowStatusColor("open")).toBe("yellow");
  });
});

import { describe, expect, it } from "bun:test";

import { genretvSyncRegistry } from "./registry";

describe("GenreTV sync registry lifecycle", () => {
  it("keeps the maintainer workflow lazy and persistent until authentication activates it", () => {
    const workflowEntries = [
      genretvSyncRegistry.publish_application,
      genretvSyncRegistry.canonical_proposal,
      genretvSyncRegistry.maintainer_notification,
    ];

    for (const entry of workflowEntries) {
      expect(entry.consistencyGroup).toBe("maintainer-workflow");
      expect(entry.subscription).toBe("lazy");
      expect(entry.retention ?? "persistent").toBe("persistent");
    }
  });
});

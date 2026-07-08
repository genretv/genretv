import { describe, expect, test } from "bun:test";

import { genretvSyncRegistry } from "./registry";

describe("genretv sync registry", () => {
  test("declares the public canonical schedule shapes", () => {
    expect(Object.keys(genretvSyncRegistry).sort()).toEqual([
      "canonical_episode",
      "canonical_proposal",
      "canonical_season",
      "canonical_show",
      "list_import",
      "maintainer_notification",
      "personal_episode",
      "personal_list_exclusion",
      "personal_season",
      "personal_show",
      "publish_application",
      "published_episode",
      "published_list",
      "published_season",
      "published_show",
      "user_profile",
    ]);
    expect(genretvSyncRegistry.canonical_episode.mode).toBe("readonly");
    expect(genretvSyncRegistry.canonical_show.mode).toBe("readonly");
    expect(genretvSyncRegistry.canonical_season.mode).toBe("readonly");
    expect(genretvSyncRegistry.personal_show.mode).toBe("readwrite");
    expect(genretvSyncRegistry.personal_show.subscription).toBe("lazy");
    expect(genretvSyncRegistry.personal_show.writeMode).toBe("pessimistic");
    expect(genretvSyncRegistry.personal_season.mode).toBe("readwrite");
    expect(genretvSyncRegistry.personal_season.subscription).toBe("lazy");
    expect(genretvSyncRegistry.personal_season.writeMode).toBe("pessimistic");
    expect(genretvSyncRegistry.personal_episode.mode).toBe("readwrite");
    expect(genretvSyncRegistry.personal_episode.subscription).toBe("lazy");
    expect(genretvSyncRegistry.personal_episode.writeMode).toBe("pessimistic");
    expect(genretvSyncRegistry.personal_list_exclusion.mode).toBe("readwrite");
    expect(genretvSyncRegistry.personal_list_exclusion.subscription).toBe("lazy");
    expect(genretvSyncRegistry.personal_list_exclusion.writeMode).toBe("pessimistic");
    expect(genretvSyncRegistry.published_list.mode).toBe("readwrite");
    expect(genretvSyncRegistry.published_show.mode).toBe("readwrite");
    expect(genretvSyncRegistry.published_season.mode).toBe("readwrite");
    expect(genretvSyncRegistry.published_episode.mode).toBe("readwrite");
    expect(genretvSyncRegistry.user_profile.shape?.rowFilter?.revision).toBe("user-profile-public-or-owner-v1");
    expect(genretvSyncRegistry.publish_application.consistencyGroup).toBe("maintainer-workflow");
    expect(genretvSyncRegistry.canonical_proposal.consistencyGroup).toBe("maintainer-workflow");
    expect(genretvSyncRegistry.maintainer_notification.consistencyGroup).toBe("maintainer-workflow");
    expect(genretvSyncRegistry.canonical_episode.consistencyGroup).toBe("canonical-schedule");
    expect(genretvSyncRegistry.canonical_season.consistencyGroup).toBe("canonical-schedule");
  });
});

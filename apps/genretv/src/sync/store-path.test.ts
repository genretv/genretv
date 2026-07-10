import { describe, expect, test } from "bun:test";

import { storePathForStore } from "@genretv/offline-data/store-registry";

import { storeIndexedDbDatabaseName } from "@pgxsinkit/client";

describe("GenreTV store paths", () => {
  test("resolve to the same IndexedDB name as the former idb URL", () => {
    const storePath = storePathForStore("example-store-id");

    expect(storePath).toBe("pgxsinkit-genretv-example-store-id");
    expect(storePath).not.toContain("://");
    expect(storeIndexedDbDatabaseName(storePath)).toBe("/pglite/pgxsinkit-genretv-example-store-id");
  });
});

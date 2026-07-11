import { describe, expect, test } from "bun:test";

import {
  bindCurrentGenretvStoreToUser,
  claimGenretvStore,
  mappedGenretvStoreId,
  storePathForStore,
} from "@genretv/offline-data/store-registry";

import { storeIndexedDbDatabaseName } from "@pgxsinkit/client";

describe("GenreTV store paths", () => {
  test("resolve to the same IndexedDB name as the former idb URL", () => {
    const storePath = storePathForStore("example-store-id");

    expect(storePath).toBe("pgxsinkit-genretv-example-store-id");
    expect(storePath).not.toContain("://");
    expect(storeIndexedDbDatabaseName(storePath)).toBe("/pglite/pgxsinkit-genretv-example-store-id");
  });

  test("retains mapped stores while rotating the anonymous spare", () => {
    const previous = globalThis.localStorage;
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });

    try {
      const anonymous = claimGenretvStore(null);
      expect(bindCurrentGenretvStoreToUser("user-1")).toBe(anonymous.storeId);
      expect(mappedGenretvStoreId("user-1")).toBe(anonymous.storeId);

      const nextAnonymous = claimGenretvStore(null);
      expect(nextAnonymous.storeId).not.toBe(anonymous.storeId);
      expect(claimGenretvStore("user-1").storeId).toBe(anonymous.storeId);
    } finally {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previous });
    }
  });
});

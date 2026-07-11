import { describe, expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { genretvSyncRegistry } from "@genretv/domain/registry";

describe("optimistic write contract", () => {
  test("all writable registry entries use optimistic writes", () => {
    for (const [key, entry] of Object.entries(genretvSyncRegistry)) {
      if (entry.mode === "readonly") continue;
      expect(entry.writeMode, key).toBe("optimistic");
    }
  });

  test("application source contains no pessimistic transaction or blind update", async () => {
    const sourceRoot = join(import.meta.dir, "..");
    const sourceFiles = await typescriptFilesBelow(sourceRoot);
    const pessimisticTransaction = ["mode:", '"pessimistic"'].join(" ");
    const blindUpdate = [".update", "Blind("].join("");

    for (const path of sourceFiles) {
      const source = await readFile(path, "utf8");
      expect(source.includes(pessimisticTransaction), path).toBe(false);
      expect(source.includes(blindUpdate), path).toBe(false);
    }
  });
});

async function typescriptFilesBelow(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) return typescriptFilesBelow(entryPath);
      return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    }),
  );
  return files.flat();
}

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const drizzleDir = "infra/drizzle";

describe("database artifact contract", () => {
  test("commits Drizzle 1.0 migration folders for utilities, schema, grants, and sync artifact", async () => {
    const folders = (await readdir(drizzleDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(folders.some((folder) => folder.endsWith("_pgxsinkit_utilities"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_canonical_registry"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_canonical_public_grants"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_sync_artifact"))).toBe(true);

    for (const folder of folders) {
      expect(existsSync(join(drizzleDir, folder, "migration.sql"))).toBe(true);
      expect(existsSync(join(drizzleDir, folder, "snapshot.json"))).toBe(true);
    }
  });

  test("does not keep the retired raw SQL canonical seed in infra", async () => {
    const compose = await readFile("infra/compose/genretv-compose.yml", "utf8");

    expect(existsSync("infra/seeds/canonical-registry.sql")).toBe(false);
    expect(compose).not.toContain("schema-seed");
    expect(compose).not.toContain("canonical-registry.sql");
  });
});

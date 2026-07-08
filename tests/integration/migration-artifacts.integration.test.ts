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

  test("hardens workflow review policies in a custom Drizzle migration", async () => {
    const folders = (await readdir(drizzleDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const workflowPolicyFolder = folders.find((folder) => folder.endsWith("_workflow_review_policies"));

    expect(workflowPolicyFolder).toBeString();

    const migration = await readFile(join(drizzleDir, workflowPolicyFolder!, "migration.sql"), "utf8");

    for (const table of ["publish_application", "canonical_proposal", "maintainer_notification"]) {
      expect(migration).toContain(`DROP POLICY "${table}_update_owner_or_admin" ON "${table}"`);
      expect(migration).toContain(
        `CREATE POLICY "${table}_insert_owner_or_admin" ON "${table}" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK`,
      );
      expect(migration).toContain(
        `CREATE POLICY "${table}_update_owner_or_admin" ON "${table}" AS PERMISSIVE FOR UPDATE TO "authenticated" USING`,
      );
      expect(migration).toContain(
        `CREATE POLICY "${table}_delete_owner_or_admin" ON "${table}" AS PERMISSIVE FOR DELETE TO "authenticated" USING`,
      );
    }

    expect(migration).toContain("WHERE assigned_role.role_name_value = 'canonical_maintainer'");
    expect(migration).toContain(") WITH CHECK (");
  });
});

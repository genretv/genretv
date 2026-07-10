import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const drizzleDir = "infra/drizzle";

describe("database artifact contract", () => {
  test("commits one fresh Drizzle baseline plus required custom migrations", async () => {
    const folders = (await readdir(drizzleDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(folders).toHaveLength(6);
    expect(folders.some((folder) => folder.endsWith("_pgxsinkit_utilities"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_baseline"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_canonical_public_grants"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_workflow_review_policies"))).toBe(true);
    expect(folders.some((folder) => folder.endsWith("_workflow_notification_fanout"))).toBe(true);
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

  test("creates workflow notification fanout in a custom Drizzle migration", async () => {
    const folders = (await readdir(drizzleDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const fanoutFolder = folders.find((folder) => folder.endsWith("_workflow_notification_fanout"));

    expect(fanoutFolder).toBeString();

    const migration = await readFile(join(drizzleDir, fanoutFolder!, "migration.sql"), "utf8");

    expect(migration).toContain('CREATE OR REPLACE FUNCTION "public"."genretv_notify_publish_application_insert"()');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION "public"."genretv_notify_canonical_proposal_insert"()');
    expect(migration).toContain('CREATE TRIGGER "publish_application_notify_maintainers_after_insert"');
    expect(migration).toContain('CREATE TRIGGER "canonical_proposal_notify_maintainers_after_insert"');
    expect(migration).toContain('"maintainer_notification"');
    expect(migration).toContain("public.pgxsinkit_clock_us()");
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION "public"."genretv_notify_publish_application_insert"() FROM PUBLIC',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION "public"."genretv_notify_canonical_proposal_insert"() FROM PUBLIC',
    );
    expect(migration).toContain("Drizzle cannot express PostgreSQL trigger functions or trigger bindings");
  });

  test("models Show lifecycle and structured Season history directly in the baseline", async () => {
    const folders = (await readdir(drizzleDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const baselineFolder = folders.find((folder) => folder.endsWith("_baseline"));

    expect(baselineFolder).toBeString();

    const baseline = await readFile(join(drizzleDir, baselineFolder!, "migration.sql"), "utf8");

    for (const field of ["season_number", "release_kind", "is_final"]) {
      expect(baseline).toContain(`"${field}"`);
    }
    expect(baseline).toContain('"lifecycle_status"');
    expect(baseline).not.toContain('"source_row"');
    expect(baseline).not.toContain("DROP COLUMN");

    for (const table of ["canonical_season", "personal_season", "published_season"]) {
      const tableDefinition = baseline.match(new RegExp(`CREATE TABLE "${table}" \\(([\\s\\S]*?)\\n\\);`))?.[1];
      expect(tableDefinition).toBeString();
      expect(tableDefinition).not.toContain('"ended_reason"');
    }
  });

  test("documents and automates migration regeneration", async () => {
    const packageJson = await readFile("package.json", "utf8");
    const script = await readFile("scripts/regenerate-drizzle-migrations.ts", "utf8");

    expect(existsSync("docs/runbooks/regenerating-drizzle-migrations.md")).toBe(true);
    expect(packageJson).toContain('"db:migrations:regenerate"');
    expect(script).toContain('"canonical_public_grants"');
    expect(script).toContain('"workflow_review_policies"');
    expect(script).toContain('"workflow_notification_fanout"');
  });
});

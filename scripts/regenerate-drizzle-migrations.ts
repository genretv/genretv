import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const drizzleDir = "infra/drizzle";
const backupRoot = "tmp/agents/drizzle-migration-regeneration";
const customMigrationNames = [
  "canonical_public_grants",
  "workflow_review_policies",
  "workflow_notification_fanout",
] as const;

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Command failed: ${command} ${args.join(" ")}`);
}

function migrationFolder(name: string): string {
  const matches = readdirSync(drizzleDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(`_${name}`))
    .map((entry) => entry.name);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one *_${name} migration, found ${matches.length}`);
  }
  return path.join(drizzleDir, matches[0]!);
}

function customMigrationSql(): Map<string, string> {
  return new Map(
    customMigrationNames.map((name) => [name, readFileSync(path.join(migrationFolder(name), "migration.sql"), "utf8")]),
  );
}

function regenerate(): void {
  if (!process.argv.includes("--confirm")) {
    throw new Error("Migration regeneration replaces infra/drizzle. Re-run with --confirm.");
  }
  if (!existsSync(drizzleDir)) throw new Error(`${drizzleDir} does not exist`);

  const customSql = customMigrationSql();
  const backupDir = path.join(backupRoot, new Date().toISOString().replaceAll(/[:.]/g, "-"));
  mkdirSync(path.dirname(backupDir), { recursive: true });
  cpSync(drizzleDir, backupDir, { recursive: true });

  try {
    rmSync(drizzleDir, { recursive: true, force: true });
    mkdirSync(drizzleDir, { recursive: true });

    run("bun", ["run", "db:utilities:generate"]);
    run("bun", ["run", "db:generate", "--", "--name", "baseline"]);

    for (const name of customMigrationNames) {
      run("bun", ["run", "db:generate", "--", "--custom", "--name", name]);
      writeFileSync(path.join(migrationFolder(name), "migration.sql"), customSql.get(name)!);
    }

    run("bun", ["run", "db:sync-function:generate"]);
    run("bun", ["x", "oxfmt", "--config", ".oxfmtrc.jsonc", "--write", drizzleDir]);
  } catch (error) {
    rmSync(drizzleDir, { recursive: true, force: true });
    cpSync(backupDir, drizzleDir, { recursive: true });
    throw error;
  }

  console.log(`Regenerated ${drizzleDir}. Previous chain backed up at ${backupDir}.`);
}

regenerate();

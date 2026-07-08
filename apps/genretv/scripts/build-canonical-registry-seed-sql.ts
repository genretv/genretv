import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { buildCanonicalRegistrySeedSql } from "../../genretv-api/src/domain/canonical-seed-sql";
import type { CanonicalRegistrySeedRows } from "../../genretv-api/src/domain/canonical-seed";

interface CanonicalRegistrySeed {
  rows: CanonicalRegistrySeedRows;
}

const defaultInput = "apps/genretv/seeds/canonical-registry.seed.json";
const defaultOutput = "infra/seeds/canonical-registry.sql";

function getArgValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const inputPath = resolve(getArgValue("--input") ?? defaultInput);
  const outputPath = resolve(getArgValue("--out") ?? defaultOutput);
  const seed = JSON.parse(await readFile(inputPath, "utf8")) as CanonicalRegistrySeed;
  const sql = buildCanonicalRegistrySeedSql(seed.rows);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, sql);
  console.log(`Wrote canonical registry SQL seed to ${outputPath}`);
}

await main();

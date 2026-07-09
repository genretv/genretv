import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { analyzeCanonicalRegistrySeedRows, type CanonicalRegistrySeedRows } from "@genretv/domain/canonical-seed";

interface CanonicalRegistrySeed {
  rows: CanonicalRegistrySeedRows;
}

const defaultInput = "apps/genretv/seeds/canonical-registry.seed.json";

function getArgValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main(): Promise<void> {
  const inputPath = resolve(getArgValue("--input") ?? defaultInput);
  const seed = JSON.parse(await readFile(inputPath, "utf8")) as CanonicalRegistrySeed;
  const quality = analyzeCanonicalRegistrySeedRows(seed.rows);

  if (quality.errors.length > 0) {
    for (const error of quality.errors) {
      console.error(`${error.code}: ${error.message}`);
      for (const ref of error.refs) {
        console.error(`  ${ref}`);
      }
    }
    throw new Error(`Canonical seed quality check failed with ${quality.errors.length} errors`);
  }

  console.log(
    [
      `Canonical seed quality ok`,
      `${quality.stats.shows} shows`,
      `${quality.stats.seasons} seasons`,
      `${quality.stats.episodes} episodes`,
      `${quality.warnings.length} warnings`,
    ].join(" · "),
  );
}

await main();

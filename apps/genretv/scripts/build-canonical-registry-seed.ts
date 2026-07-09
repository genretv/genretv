import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  analyzeCanonicalRegistrySeedRows,
  buildCanonicalRegistrySeedRows,
  type BlogspotCanonicalSeed,
  type CanonicalSeedQualityReport,
  type CanonicalRegistrySeedRows,
} from "@genretv/domain/canonical-seed";

interface CanonicalRegistrySeed {
  schemaVersion: 1;
  generatedAt: string | null;
  source: unknown;
  summary: {
    shows: number;
    seasons: number;
    episodes: number;
  };
  quality: CanonicalSeedQualityReport;
  rows: CanonicalRegistrySeedRows;
}

const defaultInput = "apps/genretv/seeds/blogspot-canonical.seed.json";
const defaultOutput = "apps/genretv/seeds/canonical-registry.seed.json";

function getArgValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const inputPath = resolve(getArgValue("--input") ?? defaultInput);
  const outputPath = resolve(getArgValue("--out") ?? defaultOutput);
  const source = JSON.parse(await readFile(inputPath, "utf8")) as BlogspotCanonicalSeed & {
    generatedAt?: string;
    source?: unknown;
  };
  const rows = buildCanonicalRegistrySeedRows(source);
  const quality = analyzeCanonicalRegistrySeedRows(rows);
  const seed: CanonicalRegistrySeed = {
    schemaVersion: 1,
    generatedAt: source.generatedAt ?? null,
    source: source.source ?? null,
    summary: {
      shows: rows.shows.length,
      seasons: rows.seasons.length,
      episodes: rows.episodes.length,
    },
    quality,
    rows,
  };

  if (quality.errors.length > 0) {
    for (const error of quality.errors) {
      console.error(`${error.code}: ${error.message}`);
    }
    throw new Error(`Canonical registry seed has ${quality.errors.length} blocking quality errors`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(seed, null, 2)}\n`);
  console.log(
    [
      `Wrote ${rows.shows.length} shows, ${rows.seasons.length} seasons, and ${rows.episodes.length} episodes`,
      `${quality.warnings.length} quality warnings`,
      outputPath,
    ].join(" · "),
  );
}

await main();

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { CanonicalRegistrySeedRows } from "@genretv/domain/canonical-seed";
import { canonicalEpisodeTable, canonicalSeasonTable, canonicalShowTable } from "@genretv/domain/schema";
import { drizzle } from "drizzle-orm/bun-sql";

interface CanonicalRegistrySeed {
  rows: CanonicalRegistrySeedRows;
}

const defaultInput = "apps/genretv/seeds/canonical-registry.seed.json";
const defaultDatabaseUrl =
  "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres?sslmode=disable";

function getArgValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function seedInputPath(): string {
  return resolve(getArgValue("--input") ?? defaultInput);
}

function databaseUrl(): string {
  return process.env["DATABASE_URL"] ?? defaultDatabaseUrl;
}

async function main(): Promise<void> {
  const seed = JSON.parse(await readFile(seedInputPath(), "utf8")) as CanonicalRegistrySeed;
  const db = drizzle(databaseUrl());

  try {
    await db.transaction(async (tx) => {
      if (seed.rows.shows.length > 0) {
        await tx.insert(canonicalShowTable).values(seed.rows.shows).onConflictDoNothing();
      }
      if (seed.rows.seasons.length > 0) {
        await tx.insert(canonicalSeasonTable).values(seed.rows.seasons).onConflictDoNothing();
      }
      if (seed.rows.episodes.length > 0) {
        await tx.insert(canonicalEpisodeTable).values(seed.rows.episodes).onConflictDoNothing();
      }
    });
  } finally {
    await db.$client.close();
  }

  console.log(
    `Seeded canonical registry rows: ${seed.rows.shows.length} shows, ${seed.rows.seasons.length} seasons, ${seed.rows.episodes.length} episodes`,
  );
}

await main();

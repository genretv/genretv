import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { CanonicalRegistrySeedRows } from "@genretv/domain/canonical-seed";
import { canonicalEpisodeTable, canonicalSeasonTable, canonicalShowTable } from "@genretv/domain/schema";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";

interface CanonicalRegistrySeed {
  rows: CanonicalRegistrySeedRows;
}

const defaultInput = "apps/genretv/seeds/canonical-registry.seed.json";
const defaultDatabaseUrl =
  "postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres?sslmode=disable";
const seedBatchSize = 250;

export function chunkRows<T>(rows: readonly T[], batchSize: number): T[][] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer");
  }

  const batches: T[][] = [];
  for (let index = 0; index < rows.length; index += batchSize) {
    batches.push(rows.slice(index, index + batchSize));
  }
  return batches;
}

function excludedValue(column: { name: string }) {
  return sql`${sql.identifier("excluded")}.${sql.identifier(column.name)}`;
}

function reportProgress(label: string, completed: number, total: number): void {
  console.log(`Upserted ${completed}/${total} canonical ${label}.`);
}

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
        let completed = 0;
        for (const shows of chunkRows(seed.rows.shows, seedBatchSize)) {
          await tx
            .insert(canonicalShowTable)
            .values(shows)
            .onConflictDoUpdate({
              target: canonicalShowTable.id,
              set: {
                displayTitle: excludedValue(canonicalShowTable.displayTitle),
                originalTitle: excludedValue(canonicalShowTable.originalTitle),
                lifecycleStatus: excludedValue(canonicalShowTable.lifecycleStatus),
                endedReason: excludedValue(canonicalShowTable.endedReason),
                languages: excludedValue(canonicalShowTable.languages),
                countries: excludedValue(canonicalShowTable.countries),
                genreTags: excludedValue(canonicalShowTable.genreTags),
                externalLinks: excludedValue(canonicalShowTable.externalLinks),
                notes: excludedValue(canonicalShowTable.notes),
              },
            });
          completed += shows.length;
          reportProgress("shows", completed, seed.rows.shows.length);
        }
      }
      if (seed.rows.seasons.length > 0) {
        let completed = 0;
        for (const seasons of chunkRows(seed.rows.seasons, seedBatchSize)) {
          await tx
            .insert(canonicalSeasonTable)
            .values(seasons)
            .onConflictDoUpdate({
              target: canonicalSeasonTable.id,
              set: {
                showId: excludedValue(canonicalSeasonTable.showId),
                section: excludedValue(canonicalSeasonTable.section),
                seasonNumber: excludedValue(canonicalSeasonTable.seasonNumber),
                seasonLabel: excludedValue(canonicalSeasonTable.seasonLabel),
                title: excludedValue(canonicalSeasonTable.title),
                releaseKind: excludedValue(canonicalSeasonTable.releaseKind),
                isFinal: excludedValue(canonicalSeasonTable.isFinal),
                timing: excludedValue(canonicalSeasonTable.timing),
                releasePattern: excludedValue(canonicalSeasonTable.releasePattern),
                releasePrecision: excludedValue(canonicalSeasonTable.releasePrecision),
                dateConfidence: excludedValue(canonicalSeasonTable.dateConfidence),
                releaseWindow: excludedValue(canonicalSeasonTable.releaseWindow),
                finaleWindow: excludedValue(canonicalSeasonTable.finaleWindow),
                sortKey: excludedValue(canonicalSeasonTable.sortKey),
                episodeCount: excludedValue(canonicalSeasonTable.episodeCount),
                organizations: excludedValue(canonicalSeasonTable.organizations),
                externalLinks: excludedValue(canonicalSeasonTable.externalLinks),
                notes: excludedValue(canonicalSeasonTable.notes),
              },
            });
          completed += seasons.length;
          reportProgress("seasons", completed, seed.rows.seasons.length);
        }
      }
      if (seed.rows.episodes.length > 0) {
        let completed = 0;
        for (const episodes of chunkRows(seed.rows.episodes, seedBatchSize)) {
          await tx
            .insert(canonicalEpisodeTable)
            .values(episodes)
            .onConflictDoUpdate({
              target: canonicalEpisodeTable.id,
              set: {
                seasonId: excludedValue(canonicalEpisodeTable.seasonId),
                episodeLabel: excludedValue(canonicalEpisodeTable.episodeLabel),
                title: excludedValue(canonicalEpisodeTable.title),
                releaseWindow: excludedValue(canonicalEpisodeTable.releaseWindow),
                sortKey: excludedValue(canonicalEpisodeTable.sortKey),
                externalLinks: excludedValue(canonicalEpisodeTable.externalLinks),
                notes: excludedValue(canonicalEpisodeTable.notes),
              },
            });
          completed += episodes.length;
          reportProgress("episodes", completed, seed.rows.episodes.length);
        }
      }
    });
  } finally {
    await db.$client.close({ timeout: 5 });
  }

  console.log(
    `Seeded canonical registry rows: ${seed.rows.shows.length} shows, ${seed.rows.seasons.length} seasons, ${seed.rows.episodes.length} episodes`,
  );
}

if (import.meta.main) await main();

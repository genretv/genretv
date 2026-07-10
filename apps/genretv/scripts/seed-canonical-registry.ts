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
        for (const show of seed.rows.shows) {
          await tx
            .insert(canonicalShowTable)
            .values(show)
            .onConflictDoUpdate({
              target: canonicalShowTable.id,
              set: {
                displayTitle: show.displayTitle,
                originalTitle: show.originalTitle,
                lifecycleStatus: show.lifecycleStatus,
                endedReason: show.endedReason,
                languages: show.languages,
                countries: show.countries,
                genreTags: show.genreTags,
                externalLinks: show.externalLinks,
                notes: show.notes,
              },
            });
        }
      }
      if (seed.rows.seasons.length > 0) {
        for (const season of seed.rows.seasons) {
          await tx
            .insert(canonicalSeasonTable)
            .values(season)
            .onConflictDoUpdate({
              target: canonicalSeasonTable.id,
              set: {
                showId: season.showId,
                section: season.section,
                seasonNumber: season.seasonNumber,
                seasonLabel: season.seasonLabel,
                title: season.title,
                releaseKind: season.releaseKind,
                isFinal: season.isFinal,
                timing: season.timing,
                releasePattern: season.releasePattern,
                releasePrecision: season.releasePrecision,
                dateConfidence: season.dateConfidence,
                releaseWindow: season.releaseWindow,
                finaleWindow: season.finaleWindow,
                sortKey: season.sortKey,
                episodeCount: season.episodeCount,
                sourceRow: season.sourceRow,
                organizations: season.organizations,
                externalLinks: season.externalLinks,
                notes: season.notes,
              },
            });
        }
      }
      if (seed.rows.episodes.length > 0) {
        for (const episode of seed.rows.episodes) {
          await tx
            .insert(canonicalEpisodeTable)
            .values(episode)
            .onConflictDoUpdate({
              target: canonicalEpisodeTable.id,
              set: {
                seasonId: episode.seasonId,
                episodeLabel: episode.episodeLabel,
                title: episode.title,
                releaseWindow: episode.releaseWindow,
                sortKey: episode.sortKey,
                externalLinks: episode.externalLinks,
                notes: episode.notes,
              },
            });
        }
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

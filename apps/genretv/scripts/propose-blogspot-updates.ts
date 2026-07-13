import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  planBlogspotCanonicalProposals,
  type CanonicalSeasonSnapshot,
  type CanonicalShowSnapshot,
} from "@genretv/domain/blogspot-proposals";
import { buildCanonicalRegistrySeedRows } from "@genretv/domain/canonical-seed";
import { genretvSyncRegistry } from "@genretv/domain/registry";
import { createClient } from "@supabase/supabase-js";

import { createSyncClient } from "@pgxsinkit/client";

import { parseSeed } from "./extract-blogspot-seed";

const canonicalShow = genretvSyncRegistry.canonical_show.view!;
const canonicalSeason = genretvSyncRegistry.canonical_season.view!;
const canonicalProposal = genretvSyncRegistry.canonical_proposal.view!;
const defaultSourceUrl = "https://genretv.blogspot.com/";
const defaultStorePath = "tmp/agents/blogspot-proposer-store";

interface CommandOptions {
  help: boolean;
  input: string | null;
  json: boolean;
  sourceUrl: string;
  storePath: string;
  submit: boolean;
}

export function parseCommandOptions(argv: readonly string[]): CommandOptions {
  return {
    help: argv.includes("--help") || argv.includes("-h"),
    input: valueAfter(argv, "--input") ?? valueAfter(argv, "--source"),
    json: argv.includes("--json"),
    sourceUrl: valueAfter(argv, "--url") ?? defaultSourceUrl,
    storePath: valueAfter(argv, "--store-path") ?? defaultStorePath,
    submit: argv.includes("--submit"),
  };
}

async function main(): Promise<void> {
  const options = parseCommandOptions(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }

  const supabaseUrl = requiredEnv("GENRETV_BOT_SUPABASE_URL", "VITE_GENRETV_SUPABASE_URL");
  const publishableKey = requiredEnv("GENRETV_BOT_PUBLISHABLE_KEY", "VITE_GENRETV_PUBLISHABLE_KEY");
  const email = requiredEnv("GENRETV_BOT_EMAIL");
  const password = requiredEnv("GENRETV_BOT_PASSWORD");
  const functionsRegion = optionalEnv("GENRETV_BOT_FUNCTIONS_REGION", "VITE_GENRETV_FUNCTIONS_REGION");
  const { html, sourceLabel, sourceUrl } = await loadSource(options);
  const parsed = parseSeed(html, sourceLabel);
  const sourceRows = buildCanonicalRegistrySeedRows(parsed);
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error != null) throw error;
  if (data.session == null) throw new Error("Import-bot sign-in returned no session");
  const roles = roleNames(data.user.app_metadata);
  if (!roles.includes("publisher") && !roles.includes("canonical_maintainer")) {
    throw new Error(`${email} must have the publisher or canonical_maintainer app_metadata role`);
  }

  await mkdir(dirname(resolve(options.storePath)), { recursive: true });
  const syncClient = await createSyncClient({
    registry: genretvSyncRegistry,
    electricUrl: `${supabaseUrl}/functions/v1/genretv-sync`,
    writeUrl: `${supabaseUrl}/functions/v1/genretv-write`,
    storePath: options.storePath,
    getAuthToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
    requestHeaders: { apikey: publishableKey },
    ...(functionsRegion === "" ? {} : { writeRequestHeaders: { "x-region": functionsRegion } }),
  });

  try {
    await syncClient.ready;
    const [shows, seasons, existingProposals] = await Promise.all([
      syncClient.query((client) => client.drizzle.select().from(canonicalShow)),
      syncClient.query((client) => client.drizzle.select().from(canonicalSeason)),
      syncClient.query((client) =>
        client.drizzle.select({ sourceFingerprint: canonicalProposal.sourceFingerprint }).from(canonicalProposal),
      ),
    ]);
    assertCanonicalBaseline({
      canonicalShowCount: shows.length,
      canonicalSeasonCount: seasons.length,
      sourceShowCount: sourceRows.shows.length,
      sourceSeasonCount: sourceRows.seasons.length,
    });
    const observedAt = Date.parse(parsed.generatedAt);
    const plan = planBlogspotCanonicalProposals({
      source: {
        kind: "blogspot",
        url: sourceUrl,
        observedAtUs: BigInt(Number.isNaN(observedAt) ? Date.now() : observedAt) * 1000n,
      },
      sourceRows,
      canonical: {
        shows: shows.map(asCanonicalShowSnapshot),
        seasons: seasons.map(asCanonicalSeasonSnapshot),
      },
      existingFingerprints: new Set(
        existingProposals.flatMap((proposal) =>
          proposal.sourceFingerprint == null ? [] : [proposal.sourceFingerprint],
        ),
      ),
    });

    if (options.submit && plan.proposals.length > 0) {
      for (const proposal of plan.proposals) {
        await syncClient.transaction({ mode: "optimistic" }, (tx) => {
          tx.tables.canonical_proposal.create({
            id: crypto.randomUUID(),
            proposalKind: proposal.proposalKind,
            title: proposal.title,
            message: proposal.message,
            canonicalShowId: proposal.canonicalShowId,
            canonicalSeasonId: proposal.canonicalSeasonId,
            canonicalEpisodeId: proposal.canonicalEpisodeId,
            proposedPayload: proposal.proposedPayload,
            sourceKind: proposal.source.kind,
            sourceUrl: proposal.source.url,
            sourceFingerprint: proposal.fingerprint,
            sourceObservedAtUs: proposal.source.observedAtUs,
          });
        });
      }
      await syncClient.flush("canonical_proposal");
      await syncClient.reconcile("canonical_proposal");
    }

    printResult(plan, options);
  } finally {
    await syncClient.stop();
    await supabase.auth.signOut();
  }
}

interface CanonicalBaselineCounts {
  canonicalSeasonCount: number;
  canonicalShowCount: number;
  sourceSeasonCount: number;
  sourceShowCount: number;
}

export function assertCanonicalBaseline(counts: CanonicalBaselineCounts): void {
  const missingShows = counts.sourceShowCount > 0 && counts.canonicalShowCount === 0;
  const missingSeasons = counts.sourceSeasonCount > 0 && counts.canonicalSeasonCount === 0;
  if (!missingShows && !missingSeasons) return;

  throw new Error(
    "Refusing to propose Blogspot changes because the synchronized canonical baseline is empty " +
      `(${counts.canonicalShowCount} Shows, ${counts.canonicalSeasonCount} Seasons). ` +
      "Verify the target project and bootstrap its canonical data before running the proposer.",
  );
}

function asCanonicalShowSnapshot(row: typeof canonicalShow.$inferSelect): CanonicalShowSnapshot {
  return {
    id: row.id,
    displayTitle: row.displayTitle,
    originalTitle: row.originalTitle,
    lifecycleStatus:
      row.lifecycleStatus === "cancelled" || row.lifecycleStatus === "ended" ? row.lifecycleStatus : "open",
    endedReason: row.endedReason,
    languages: stringArray(row.languages),
    countries: stringArray(row.countries),
    genreTags: stringArray(row.genreTags),
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function asCanonicalSeasonSnapshot(row: typeof canonicalSeason.$inferSelect): CanonicalSeasonSnapshot {
  const releaseKind =
    row.releaseKind === "special" ||
    row.releaseKind === "movie" ||
    row.releaseKind === "pilot" ||
    row.releaseKind === "other"
      ? row.releaseKind
      : "season";
  const section = row.section === "current" || row.section === "past" ? row.section : "upcoming";
  return {
    id: row.id,
    showId: row.showId,
    section,
    seasonNumber: row.seasonNumber,
    seasonLabel: row.seasonLabel,
    title: row.title,
    releaseKind,
    isFinal: row.isFinal,
    timing: row.timing,
    releasePattern: row.releasePattern,
    releasePrecision: row.releasePrecision,
    dateConfidence: row.dateConfidence,
    releaseWindow: releaseWindow(row.releaseWindow),
    finaleWindow: releaseWindow(row.finaleWindow),
    sortKey: row.sortKey,
    episodeCount: row.episodeCount,
    organizations: organizations(row.organizations),
    externalLinks: externalLinks(row.externalLinks),
    notes: row.notes,
  };
}

function printResult(plan: ReturnType<typeof planBlogspotCanonicalProposals>, options: CommandOptions): void {
  const output = {
    mode: options.submit ? "submitted" : "dry-run",
    proposalCount: plan.proposals.length,
    skippedDuplicateCount: plan.skippedDuplicateCount,
    unchangedShowCount: plan.unchangedShowCount,
    unchangedSeasonCount: plan.unchangedSeasonCount,
    issues: plan.issues,
    proposals: plan.proposals.map((proposal) => ({
      kind: proposal.proposalKind,
      title: proposal.title,
      canonicalShowId: proposal.canonicalShowId,
      canonicalSeasonId: proposal.canonicalSeasonId,
      fields: Object.keys(proposal.proposedPayload),
      fingerprint: proposal.fingerprint,
    })),
  };
  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  console.log(
    `${options.submit ? "Submitted" : "Would submit"} ${plan.proposals.length} proposals; ` +
      `${plan.skippedDuplicateCount} unchanged proposals already exist; ` +
      `${plan.issues.length} rows need attention.`,
  );
  for (const proposal of output.proposals) {
    console.log(`- ${proposal.kind}: ${proposal.title} [${proposal.fields.join(", ")}]`);
  }
  for (const issue of plan.issues) console.warn(`! ${issue.code}: ${issue.detail}`);
  if (!options.submit && plan.proposals.length > 0)
    console.log("Dry run only. Re-run with --submit to create proposals.");
}

async function loadSource(options: CommandOptions): Promise<{ html: string; sourceLabel: string; sourceUrl: string }> {
  if (options.input != null) {
    const path = resolve(options.input);
    return { html: await readFile(path, "utf8"), sourceLabel: path, sourceUrl: options.sourceUrl };
  }
  const response = await fetch(options.sourceUrl);
  if (!response.ok) throw new Error(`Fetch failed for ${options.sourceUrl}: ${response.status} ${response.statusText}`);
  return { html: await response.text(), sourceLabel: options.sourceUrl, sourceUrl: options.sourceUrl };
}

function roleNames(value: unknown): string[] {
  if (typeof value !== "object" || value == null || !("roles" in value)) return [];
  return stringArray((value as { roles?: unknown }).roles);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function externalLinks(value: unknown): Array<{ kind?: string; label: string; url: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item == null) return [];
    const link = item as Record<string, unknown>;
    if (typeof link["label"] !== "string" || typeof link["url"] !== "string") return [];
    return [
      { ...(typeof link["kind"] === "string" ? { kind: link["kind"] } : {}), label: link["label"], url: link["url"] },
    ];
  });
}

function organizations(
  value: unknown,
): Array<{ name: string; role: string; externalLinks: ReturnType<typeof externalLinks> }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item == null) return [];
    const organization = item as Record<string, unknown>;
    if (typeof organization["name"] !== "string" || typeof organization["role"] !== "string") return [];
    return [
      {
        name: organization["name"],
        role: organization["role"],
        externalLinks: externalLinks(organization["externalLinks"]),
      },
    ];
  });
}

function releaseWindow(value: unknown): CanonicalSeasonSnapshot["releaseWindow"] {
  if (typeof value !== "object" || value == null || Array.isArray(value)) return null;
  const window = value as Record<string, unknown>;
  return {
    raw: typeof window["raw"] === "string" ? window["raw"] : "",
    precision: typeof window["precision"] === "string" ? window["precision"] : "unknown",
    confidence: typeof window["confidence"] === "string" ? window["confidence"] : "unknown",
    year: typeof window["year"] === "number" ? window["year"] : null,
    month: typeof window["month"] === "number" ? window["month"] : null,
    day: typeof window["day"] === "number" ? window["day"] : null,
    releaseSeason: typeof window["releaseSeason"] === "string" ? window["releaseSeason"] : null,
  };
}

function requiredEnv(...names: string[]): string {
  const value = optionalEnv(...names);
  if (value !== "") return value;
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function optionalEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value != null && value !== "") return value;
  }
  return "";
}

function valueAfter(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  return index < 0 ? null : (argv[index + 1] ?? null);
}

function helpText(): string {
  return `Usage: bun run canonical:propose:blogspot [options]

Fetch the canonical Blogspot page, compare it with the synced canonical registry, and print ordinary
canonical proposals. This is a dry run unless --submit is present.

Options:
  --submit             Create proposals through the pgxsinkit registry
  --input PATH         Read saved HTML instead of fetching (alias: --source)
  --url URL            Override the canonical source URL
  --store-path PATH    Override the persistent PGlite tooling store
  --json               Print machine-readable output
  --help               Show this help
`;
}

if (import.meta.main) await main();

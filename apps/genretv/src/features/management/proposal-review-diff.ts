import type { ManagementShow } from "../../domain/schedule";

export interface ProposalReviewDiffInput {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  proposalKind: string;
  proposedPayload: unknown;
}

export interface ProposalReviewDiffRow {
  current: string;
  field: string;
  proposed: string;
  status: "changed" | "new" | "unchanged";
}

export function proposalReviewDiffRows(
  proposal: ProposalReviewDiffInput,
  shows: readonly ManagementShow[],
): ProposalReviewDiffRow[] {
  const payload = record(proposal.proposedPayload);
  if (proposal.proposalKind === "show") return showDiffRows(proposal, payload, shows);
  if (proposal.proposalKind === "season") return seasonDiffRows(proposal, payload, shows);
  if (proposal.proposalKind === "episode") return episodeDiffRows(proposal, payload, shows);
  return genericDiffRows(payload);
}

function showDiffRows(
  proposal: ProposalReviewDiffInput,
  payload: Record<string, unknown>,
  shows: readonly ManagementShow[],
): ProposalReviewDiffRow[] {
  const current = proposal.canonicalShowId == null ? null : shows.find((show) => show.id === proposal.canonicalShowId);
  return compactRows([
    diffRow("Title", current?.title, text(payload["displayTitle"])),
    diffRow("Original title", current?.originalTitle, text(payload["originalTitle"])),
    diffRow("Lifecycle", current?.lifecycleStatus, text(payload["lifecycleStatus"])),
    diffRow("Ending reason", current?.endedReason, text(payload["endedReason"])),
    diffRow("Languages", current?.languages, stringArray(payload["languages"])),
    diffRow("Countries", current?.countries, stringArray(payload["countries"])),
    diffRow("Genres", current?.genres, stringArray(payload["genreTags"])),
    diffRow("Links", countLabel(current?.links), countLabel(arrayValue(payload["externalLinks"]))),
    diffRow("Notes", current?.notes, text(payload["notes"])),
  ]);
}

function seasonDiffRows(
  proposal: ProposalReviewDiffInput,
  payload: Record<string, unknown>,
  shows: readonly ManagementShow[],
): ProposalReviewDiffRow[] {
  const currentShow =
    proposal.canonicalShowId == null ? null : shows.find((show) => show.id === proposal.canonicalShowId);
  const currentSeason =
    proposal.canonicalSeasonId == null
      ? null
      : shows.flatMap((show) => show.seasons).find((season) => season.id === proposal.canonicalSeasonId);
  return compactRows([
    diffRow("Show", currentShow?.title, text(payload["showTitle"])),
    diffRow("Season", currentSeason?.seasonLabel, text(payload["seasonLabel"])),
    diffRow("Season number", numberText(currentSeason?.seasonNumber), numberText(payload["seasonNumber"])),
    diffRow("Release title", currentSeason?.title, text(payload["title"])),
    diffRow("Release kind", currentSeason?.releaseKind, text(payload["releaseKind"])),
    diffRow("Final release", currentSeason?.isFinal, payload["isFinal"]),
    diffRow("Section", currentSeason?.section, text(payload["section"])),
    diffRow("When", currentSeason?.timing, text(payload["timing"])),
    diffRow("Release pattern", currentSeason?.releasePattern, text(payload["releasePattern"])),
    diffRow(
      "Release window",
      releaseWindowSummary(currentSeason?.releaseWindow),
      releaseWindowSummary(payload["releaseWindow"]),
    ),
    diffRow(
      "Finale window",
      releaseWindowSummary(currentSeason?.finaleWindow),
      releaseWindowSummary(payload["finaleWindow"]),
    ),
    diffRow("Date precision", currentSeason?.releasePrecision, text(payload["releasePrecision"])),
    diffRow("Date confidence", currentSeason?.dateConfidence, text(payload["dateConfidence"])),
    diffRow("Episodes", numberText(currentSeason?.episodeCount), numberText(payload["episodeCount"])),
    diffRow("Sort key", currentSeason?.sortKey, text(payload["sortKey"])),
    diffRow("Organizations", currentSeason?.organizations, organizationNames(payload["organizations"])),
    diffRow("Links", countLabel(currentSeason?.links), countLabel(arrayValue(payload["externalLinks"]))),
    diffRow("Notes", currentSeason?.notes, text(payload["notes"])),
  ]);
}

function episodeDiffRows(
  proposal: ProposalReviewDiffInput,
  payload: Record<string, unknown>,
  shows: readonly ManagementShow[],
): ProposalReviewDiffRow[] {
  const currentSeason =
    proposal.canonicalSeasonId == null
      ? null
      : shows.flatMap((show) => show.seasons).find((season) => season.id === proposal.canonicalSeasonId);
  const currentEpisode =
    proposal.canonicalEpisodeId == null
      ? null
      : shows
          .flatMap((show) => show.seasons)
          .flatMap((season) => season.episodes)
          .find((episode) => episode.id === proposal.canonicalEpisodeId);
  return compactRows([
    diffRow(
      "Show",
      currentSeason == null ? null : parentShowTitle(currentSeason.id, shows),
      text(payload["showTitle"]),
    ),
    diffRow("Season", currentSeason?.seasonLabel, text(payload["seasonLabel"])),
    diffRow("Episode", currentEpisode?.episodeLabel, text(payload["episodeLabel"])),
    diffRow("Title", currentEpisode?.title, text(payload["title"])),
    diffRow(
      "Release window",
      releaseWindowSummary(currentEpisode?.releaseWindow),
      releaseWindowSummary(payload["releaseWindow"]),
    ),
    diffRow("Sort key", currentEpisode?.sortKey, text(payload["sortKey"])),
    diffRow("Links", countLabel(currentEpisode?.links), countLabel(arrayValue(payload["externalLinks"]))),
    diffRow("Notes", currentEpisode?.notes, text(payload["notes"])),
  ]);
}

function genericDiffRows(payload: Record<string, unknown>): ProposalReviewDiffRow[] {
  return Object.entries(payload)
    .flatMap(([field, value]) => {
      if (field === "kind") return [];
      const formatted = formatValue(value);
      return formatted === "" ? [] : [{ current: "New", field, proposed: formatted, status: "new" as const }];
    })
    .slice(0, 12);
}

function diffRow(field: string, currentValue: unknown, proposedValue: unknown): ProposalReviewDiffRow | null {
  const current = formatValue(currentValue);
  const proposed = formatValue(proposedValue);
  if (current === "" && proposed === "") return null;
  return {
    current: current === "" ? "New" : current,
    field,
    proposed: proposed === "" ? "Clear" : proposed,
    status:
      current === "" ? "new" : normalizeComparable(current) === normalizeComparable(proposed) ? "unchanged" : "changed",
  };
}

function parentShowTitle(seasonId: string, shows: readonly ManagementShow[]): string | null {
  return shows.find((show) => show.seasons.some((season) => season.id === seasonId))?.title ?? null;
}

function organizationNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    if (isRecord(item) && typeof item["name"] === "string") return [item["name"]];
    return [];
  });
}

function compactRows(rows: Array<ProposalReviewDiffRow | null>): ProposalReviewDiffRow[] {
  return rows.filter((row): row is ProposalReviewDiffRow => row != null);
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(", ");
  return "";
}

function normalizeComparable(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function releaseWindowSummary(value: unknown): string | null {
  if (!isRecord(value) || typeof value["raw"] !== "string" || value["raw"].trim() === "") return null;
  const raw = value["raw"].trim();
  const precision = text(value["precision"]);
  const confidence = text(value["confidence"]);
  return [raw, precision, confidence].filter((item) => item != null && item !== "unknown").join(" / ");
}

function countLabel(value: unknown): string | null {
  return Array.isArray(value) && value.length > 0 ? `${value.length}` : null;
}

function numberText(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) && !Array.isArray(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

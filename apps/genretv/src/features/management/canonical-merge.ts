const defaultSourceRow = 1_000_000;

export interface CanonicalProposalMergeInput {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  proposalKind: string;
  proposedPayload: unknown;
  title: string;
}

export interface CanonicalShowCreate {
  countries: string[];
  displayTitle: string;
  externalLinks: unknown[];
  genreTags: string[];
  id: string;
  languages: string[];
  notes: string | null;
  originalTitle: string | null;
}

export type CanonicalShowPatch = Omit<CanonicalShowCreate, "id">;

export interface CanonicalSeasonCreate {
  dateConfidence: string;
  endedReason: string;
  episodeCount: number | null;
  externalLinks: unknown[];
  finaleWindow: unknown;
  id: string;
  notes: string | null;
  organizations: unknown[];
  releasePattern: string | null;
  releasePrecision: string;
  releaseWindow: unknown;
  seasonLabel: string;
  section: "current" | "upcoming" | "past";
  showId: string;
  sortKey: string | null;
  sourceRow: number;
  timing: string;
}

export type CanonicalSeasonPatch = Omit<CanonicalSeasonCreate, "id" | "sourceRow">;

export interface CanonicalEpisodeCreate {
  episodeLabel: string | null;
  externalLinks: unknown[];
  id: string;
  notes: string | null;
  releaseWindow: unknown;
  seasonId: string;
  sortKey: string | null;
  title: string | null;
}

export type CanonicalEpisodePatch = Omit<CanonicalEpisodeCreate, "id">;

export interface CanonicalProposalMergePlan {
  episodeCreate: CanonicalEpisodeCreate | null;
  episodeUpdate: { id: string; patch: CanonicalEpisodePatch } | null;
  seasonCreate: CanonicalSeasonCreate | null;
  seasonUpdate: { id: string; patch: CanonicalSeasonPatch } | null;
  showCreate: CanonicalShowCreate | null;
  showUpdate: { id: string; patch: CanonicalShowPatch } | null;
}

export function buildCanonicalProposalMergePlan(
  proposal: CanonicalProposalMergeInput,
  makeId: () => string,
): CanonicalProposalMergePlan {
  if (proposal.proposalKind === "show") return showMergePlan(proposal, makeId);
  if (proposal.proposalKind === "season") return seasonMergePlan(proposal, makeId);
  if (proposal.proposalKind === "episode") return episodeMergePlan(proposal, makeId);
  return emptyPlan();
}

function showMergePlan(proposal: CanonicalProposalMergeInput, makeId: () => string): CanonicalProposalMergePlan {
  const payload = record(proposal.proposedPayload);
  const patch: CanonicalShowPatch = {
    displayTitle: text(payload["displayTitle"]) ?? proposal.title,
    originalTitle: nullableText(payload["originalTitle"]),
    languages: stringArray(payload["languages"]),
    countries: stringArray(payload["countries"]),
    genreTags: stringArray(payload["genreTags"]),
    externalLinks: arrayValue(payload["externalLinks"]),
    notes: nullableText(payload["notes"]),
  };
  if (proposal.canonicalShowId != null) {
    return { ...emptyPlan(), showUpdate: { id: proposal.canonicalShowId, patch } };
  }
  return { ...emptyPlan(), showCreate: { id: makeId(), ...patch } };
}

function seasonMergePlan(proposal: CanonicalProposalMergeInput, makeId: () => string): CanonicalProposalMergePlan {
  const payload = record(proposal.proposedPayload);
  const showId = proposal.canonicalShowId ?? makeId();
  const showTitle = text(payload["showTitle"]) ?? proposal.title;
  const seasonPatch: CanonicalSeasonPatch = {
    showId,
    section: scheduleSection(text(payload["section"])),
    seasonLabel: text(payload["seasonLabel"]) ?? "Season",
    timing: text(payload["timing"]) ?? "",
    endedReason: text(payload["endedReason"]) ?? "",
    releasePattern: nullableText(payload["releasePattern"]),
    releasePrecision: text(payload["releasePrecision"]) ?? "unknown",
    dateConfidence: text(payload["dateConfidence"]) ?? "unknown",
    releaseWindow: payload["releaseWindow"] ?? null,
    finaleWindow: payload["finaleWindow"] ?? null,
    sortKey: nullableText(payload["sortKey"]),
    episodeCount: integerOrNull(payload["episodeCount"]),
    organizations: arrayValue(payload["organizations"]),
    externalLinks: arrayValue(payload["externalLinks"]),
    notes: nullableText(payload["notes"]),
  };
  const showCreate =
    proposal.canonicalShowId == null
      ? {
          id: showId,
          displayTitle: showTitle,
          originalTitle: null,
          languages: [],
          countries: [],
          genreTags: [],
          externalLinks: [],
          notes: null,
        }
      : null;
  if (proposal.canonicalSeasonId != null) {
    return { ...emptyPlan(), showCreate, seasonUpdate: { id: proposal.canonicalSeasonId, patch: seasonPatch } };
  }
  return {
    ...emptyPlan(),
    showCreate,
    seasonCreate: {
      id: makeId(),
      sourceRow: integerOrNull(payload["sourceRow"]) ?? defaultSourceRow,
      ...seasonPatch,
    },
  };
}

function episodeMergePlan(proposal: CanonicalProposalMergeInput, makeId: () => string): CanonicalProposalMergePlan {
  const payload = record(proposal.proposedPayload);
  const showId = proposal.canonicalShowId ?? makeId();
  const seasonId = proposal.canonicalSeasonId ?? makeId();
  const episodePatch: CanonicalEpisodePatch = {
    seasonId,
    episodeLabel: nullableText(payload["episodeLabel"]),
    title: nullableText(payload["title"]),
    releaseWindow: payload["releaseWindow"] ?? null,
    sortKey: nullableText(payload["sortKey"]),
    externalLinks: arrayValue(payload["externalLinks"]),
    notes: nullableText(payload["notes"]),
  };
  const parentPlan =
    proposal.canonicalSeasonId == null
      ? parentRowsForEpisodeProposal(proposal, payload, showId, seasonId)
      : { showCreate: null, seasonCreate: null };
  if (proposal.canonicalEpisodeId != null) {
    return {
      ...emptyPlan(),
      ...parentPlan,
      episodeUpdate: { id: proposal.canonicalEpisodeId, patch: episodePatch },
    };
  }
  return {
    ...emptyPlan(),
    ...parentPlan,
    episodeCreate: {
      id: makeId(),
      ...episodePatch,
    },
  };
}

function parentRowsForEpisodeProposal(
  proposal: CanonicalProposalMergeInput,
  payload: Record<string, unknown>,
  showId: string,
  seasonId: string,
): Pick<CanonicalProposalMergePlan, "seasonCreate" | "showCreate"> {
  const showCreate =
    proposal.canonicalShowId == null
      ? {
          id: showId,
          displayTitle: text(payload["showTitle"]) ?? proposal.title,
          originalTitle: null,
          languages: [],
          countries: [],
          genreTags: [],
          externalLinks: [],
          notes: null,
        }
      : null;
  return {
    showCreate,
    seasonCreate: {
      id: seasonId,
      showId,
      section: scheduleSection(text(payload["section"])),
      seasonLabel: text(payload["seasonLabel"]) ?? "Season",
      timing: text(payload["timing"]) ?? "",
      endedReason: text(payload["endedReason"]) ?? "",
      releasePattern: nullableText(payload["releasePattern"]),
      releasePrecision: text(payload["releasePrecision"]) ?? "unknown",
      dateConfidence: text(payload["dateConfidence"]) ?? "unknown",
      releaseWindow: payload["seasonReleaseWindow"] ?? null,
      finaleWindow: payload["finaleWindow"] ?? null,
      sortKey: nullableText(payload["seasonSortKey"]),
      episodeCount: integerOrNull(payload["seasonEpisodeCount"]),
      sourceRow: integerOrNull(payload["sourceRow"]) ?? defaultSourceRow,
      organizations: arrayValue(payload["organizations"]),
      externalLinks: arrayValue(payload["seasonExternalLinks"]),
      notes: nullableText(payload["seasonNotes"]),
    },
  };
}

function emptyPlan(): CanonicalProposalMergePlan {
  return {
    episodeCreate: null,
    episodeUpdate: null,
    seasonCreate: null,
    seasonUpdate: null,
    showCreate: null,
    showUpdate: null,
  };
}

function scheduleSection(value: string | null): "current" | "upcoming" | "past" {
  return value === "current" || value === "upcoming" || value === "past" ? value : "upcoming";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function nullableText(value: unknown): string | null {
  return text(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function integerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

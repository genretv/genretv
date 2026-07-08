export interface ExclusionRow {
  canonicalEpisodeId: string | null;
  canonicalSeasonId: string | null;
  canonicalShowId: string | null;
  excludedKind: string;
  id: string;
  reason: string | null;
}

export interface ExclusionShowRow {
  displayTitle: string;
  id: string;
}

export interface ExclusionSeasonRow {
  id: string;
  seasonLabel: string;
  showId: string;
}

export interface ExclusionEpisodeRow {
  episodeLabel: string | null;
  id: string;
  seasonId: string;
  title: string | null;
}

export interface ExclusionSummary {
  id: string;
  kind: string;
  label: string;
  reason: string | null;
}

export function buildExclusionSummaries(
  exclusions: readonly ExclusionRow[],
  shows: readonly ExclusionShowRow[],
  seasons: readonly ExclusionSeasonRow[],
  episodes: readonly ExclusionEpisodeRow[],
): ExclusionSummary[] {
  const showsById = new Map(shows.map((show) => [show.id, show]));
  const seasonsById = new Map(seasons.map((season) => [season.id, season]));
  const episodesById = new Map(episodes.map((episode) => [episode.id, episode]));

  return exclusions
    .map((exclusion) => ({
      id: exclusion.id,
      kind: exclusion.excludedKind,
      label: exclusionLabel(exclusion, showsById, seasonsById, episodesById),
      reason: exclusion.reason,
    }))
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
}

function exclusionLabel(
  exclusion: ExclusionRow,
  showsById: ReadonlyMap<string, ExclusionShowRow>,
  seasonsById: ReadonlyMap<string, ExclusionSeasonRow>,
  episodesById: ReadonlyMap<string, ExclusionEpisodeRow>,
): string {
  if (exclusion.excludedKind === "show" && exclusion.canonicalShowId != null) {
    return showsById.get(exclusion.canonicalShowId)?.displayTitle ?? exclusion.canonicalShowId;
  }
  if (exclusion.excludedKind === "season" && exclusion.canonicalSeasonId != null) {
    const season = seasonsById.get(exclusion.canonicalSeasonId);
    if (season == null) return exclusion.canonicalSeasonId;
    return `${showsById.get(season.showId)?.displayTitle ?? season.showId} ${season.seasonLabel}`.trim();
  }
  if (exclusion.excludedKind === "episode" && exclusion.canonicalEpisodeId != null) {
    const episode = episodesById.get(exclusion.canonicalEpisodeId);
    if (episode == null) return exclusion.canonicalEpisodeId;
    const season = seasonsById.get(episode.seasonId);
    const showTitle = season == null ? null : (showsById.get(season.showId)?.displayTitle ?? season.showId);
    return [showTitle, season?.seasonLabel, episode.episodeLabel, episode.title].filter(Boolean).join(" · ");
  }
  return exclusion.id;
}

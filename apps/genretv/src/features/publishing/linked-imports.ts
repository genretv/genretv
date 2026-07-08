const linkedPublishedEpisodePrefix = "published-episode:";
const linkedPublishedSeasonPrefix = "published-season:";
const linkedPublishedShowPrefix = "published-show:";

export function linkedPublishedEpisodeId(sourceId: string): string {
  return `${linkedPublishedEpisodePrefix}${sourceId}`;
}

export function linkedPublishedSeasonId(sourceId: string): string {
  return `${linkedPublishedSeasonPrefix}${sourceId}`;
}

export function linkedPublishedShowId(sourceId: string): string {
  return `${linkedPublishedShowPrefix}${sourceId}`;
}

export function isLinkedPublishedShowId(id: string): boolean {
  return id.startsWith(linkedPublishedShowPrefix);
}

export function sourcePublishedSeasonIdFromLinkedId(id: string): string | null {
  return id.startsWith(linkedPublishedSeasonPrefix) ? id.slice(linkedPublishedSeasonPrefix.length) : null;
}

export interface PublishedListOwnershipRow {
  ownerId: string;
  slug: string;
}

export function ownPublishedLists<T extends PublishedListOwnershipRow>(
  rows: readonly T[],
  ownerId: string | null,
): T[] {
  return ownerId == null ? [] : rows.filter((row) => row.ownerId === ownerId);
}

export function publishedSlugTakenByAnother(
  rows: readonly PublishedListOwnershipRow[],
  slug: string,
  ownerId: string | null,
): boolean {
  if (slug === "") return false;
  const matching = rows.find((row) => row.slug === slug);
  return matching != null && (ownerId == null || matching.ownerId !== ownerId);
}

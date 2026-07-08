export interface ProfileDraft {
  bio: string;
  displayName: string;
  isPublic: boolean;
  publicSlug: string;
}

export interface ProfilePatch {
  bio: string | null;
  displayName: string;
  isPublic: boolean;
  publicSlug: string | null;
}

export function defaultDisplayName(email: string | null | undefined): string {
  const localPart = email?.split("@")[0]?.trim();
  return localPart === "" || localPart == null ? "GenreTV user" : localPart;
}

export function normalizeProfileSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function profilePatchFromDraft(draft: ProfileDraft, fallbackDisplayName: string): ProfilePatch {
  const displayName = draft.displayName.trim() || fallbackDisplayName;
  const publicSlug = normalizeProfileSlug(draft.publicSlug);
  const bio = draft.bio.trim();
  return {
    displayName,
    publicSlug: publicSlug === "" ? null : publicSlug,
    bio: bio === "" ? null : bio,
    isPublic: draft.isPublic,
  };
}

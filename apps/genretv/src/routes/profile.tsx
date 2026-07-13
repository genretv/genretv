import { genretvSyncRegistry } from "@genretv/domain/registry";
import { useLiveDrizzleRows, useSyncClient } from "@genretv/offline-data/hooks";
import { Alert, Button, Checkbox, Group, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/auth";
import { liveAggregateState } from "../domain/live-query-readiness";
import { formatMicrosecondTimestamp } from "../domain/time";
import {
  defaultDisplayName,
  normalizeProfileSlug,
  profilePatchFromDraft,
  type ProfileDraft,
} from "../features/profile/profile";

const userProfile = genretvSyncRegistry.user_profile.view!;

export function ProfileRoute() {
  const { session } = useAuth();
  const client = useSyncClient();
  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: "",
    publicSlug: "",
    bio: "",
    isPublic: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallbackDisplayName = defaultDisplayName(session?.user.email);
  const profiles = useLiveDrizzleRows(
    (sync) =>
      sync.drizzle
        .select({
          id: userProfile.id,
          displayName: userProfile.displayName,
          publicSlug: userProfile.publicSlug,
          bio: userProfile.bio,
          isPublic: userProfile.isPublic,
          updatedAtUs: userProfile.updatedAtUs,
        })
        .from(userProfile),
    [],
    { ready: session != null },
  );
  const profile = profiles.rows[0] ?? null;
  const profileState = liveAggregateState([profiles], profile != null);
  const profileDisplayName = profile?.displayName ?? null;
  const profilePublicSlug = profile?.publicSlug ?? null;
  const profileBio = profile?.bio ?? null;
  const profileIsPublic = profile?.isPublic ?? null;
  const profileExists = profile != null;
  const normalizedSlug = normalizeProfileSlug(draft.publicSlug);
  const patch = useMemo(() => profilePatchFromDraft(draft, fallbackDisplayName), [draft, fallbackDisplayName]);
  const userId = session?.user.id ?? null;
  const canSave = session != null && !profileState.loading && !saving && patch.displayName.trim() !== "";
  const syncedDraft = useMemo<ProfileDraft>(
    () =>
      !profileExists
        ? {
            displayName: fallbackDisplayName,
            publicSlug: "",
            bio: "",
            isPublic: false,
          }
        : {
            displayName: profileDisplayName ?? fallbackDisplayName,
            publicSlug: profilePublicSlug ?? "",
            bio: profileBio ?? "",
            isPublic: profileIsPublic ?? false,
          },
    [fallbackDisplayName, profileBio, profileDisplayName, profileExists, profileIsPublic, profilePublicSlug],
  );

  useEffect(() => {
    if (userId == null) return;
    setDraft(syncedDraft);
  }, [syncedDraft, userId]);

  const saveProfile = async () => {
    if (session == null) return;
    const profileId = profile?.id ?? crypto.randomUUID();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await client.transaction({ mode: "optimistic" }, (tx) => {
        if (profile == null) {
          tx.tables.user_profile.create({
            id: profileId,
            ...patch,
          });
        } else {
          tx.tables.user_profile.update({ id: profile.id }, patch);
        }
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  if (session == null) {
    return (
      <Stack className="schedule-panel" gap="md" maw={760} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Profile</Title>
        <Alert color="yellow" variant="light">
          Sign in to manage your GenreTV profile.
        </Alert>
        <Group>
          <Button component={Link} to="/login" variant="light">
            Sign in
          </Button>
          <Button component={Link} to="/" variant="default">
            Schedule
          </Button>
        </Group>
      </Stack>
    );
  }

  if (profileState.loading) {
    return (
      <Stack className="schedule-panel" gap="lg" maw={860} mx="auto" p={{ base: "md", sm: "xl" }}>
        <Title order={1}>Profile</Title>
        {profiles.error == null ? (
          <Alert color="blue" variant="light">
            Loading your profile...
          </Alert>
        ) : (
          <Alert color="red" variant="light">
            Could not load your profile: {profiles.error.message}
          </Alert>
        )}
      </Stack>
    );
  }

  return (
    <Stack className="schedule-panel" gap="lg" maw={860} mx="auto" p={{ base: "md", sm: "xl" }}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Profile</Title>
          <Text c="dimmed">Choose the name and public identity used around published lists.</Text>
        </div>
        <Button component={Link} to="/publishing" variant="default">
          Publishing
        </Button>
      </Group>

      {profiles.error != null && (
        <Alert color="red" variant="light">
          Could not load your profile: {profiles.error.message}
        </Alert>
      )}
      {error != null && (
        <Alert color="red" variant="light">
          Could not save your profile: {error}
        </Alert>
      )}
      {saved && (
        <Alert color="teal" variant="light">
          Profile saved locally.
        </Alert>
      )}

      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Display name"
            value={draft.displayName}
            onChange={(event) => {
              const displayName = event.currentTarget.value;
              setSaved(false);
              setDraft((current) => ({ ...current, displayName }));
            }}
          />
          <TextInput
            label="Public slug"
            description={normalizedSlug === "" ? "Leave blank until you want a public profile slug." : normalizedSlug}
            value={draft.publicSlug}
            onChange={(event) => {
              const publicSlug = event.currentTarget.value;
              setSaved(false);
              setDraft((current) => ({ ...current, publicSlug }));
            }}
          />
        </SimpleGrid>
        <Textarea
          label="Bio"
          autosize
          minRows={4}
          value={draft.bio}
          onChange={(event) => {
            const bio = event.currentTarget.value;
            setSaved(false);
            setDraft((current) => ({ ...current, bio }));
          }}
        />
        <Checkbox
          label="Make this profile public"
          checked={draft.isPublic}
          onChange={(event) => {
            const checked = event.currentTarget.checked;
            setSaved(false);
            setDraft((current) => ({ ...current, isPublic: checked }));
          }}
        />
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            {profile == null ? "No profile saved yet." : `Last saved ${formatMicroseconds(profile.updatedAtUs)}.`}
          </Text>
          <Button loading={saving} disabled={!canSave} onClick={() => void saveProfile()}>
            Save profile
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}

const formatMicroseconds = formatMicrosecondTimestamp;

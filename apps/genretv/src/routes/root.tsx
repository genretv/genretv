import { Anchor, AppShell, Button, Center, Group, Loader, Stack, Text } from "@mantine/core";
import { IconCloudUp, IconHelpCircle } from "@tabler/icons-react";
import { Link, Outlet } from "@tanstack/react-router";

import { useAuth } from "../auth/auth";
import { LoadingSplash } from "../components/loading-splash";
import { PwaStatus } from "../components/pwa-status";
import { SyncStatusButton } from "../components/sync-status-button";
import { LiveCanonicalScheduleProvider } from "../domain/live-canonical-schedule";
import { PublishedListDirectoryProvider } from "../features/publishing/use-published-list-directory";
import { useGenretvSyncLifecycle } from "../sync/provider";

export function RootLayout() {
  const { loading: authLoading, session, signOut } = useAuth();
  const sync = useGenretvSyncLifecycle();
  return (
    <AppShell header={{ height: { base: 104, sm: 58 } }} padding="md">
      <AppShell.Header>
        <Group className="app-header-content" h="100%" px="md" justify="space-between">
          <Group className="app-header-nav">
            <Anchor component={Link} to="/" underline="never" c="dark">
              <Text fw={800}>GenreTV</Text>
            </Anchor>
            <Anchor component={Link} to="/" size="sm">
              Schedule
            </Anchor>
            <Anchor component={Link} to="/manage" size="sm">
              Manage
            </Anchor>
            <Anchor component={Link} to="/published" size="sm">
              Published
            </Anchor>
            <Anchor component={Link} to="/publishing" size="sm">
              Publishing
            </Anchor>
            <Anchor className="app-help-link" href="/docs/" size="sm" aria-label="Help">
              <IconHelpCircle aria-hidden="true" size={17} stroke={1.8} />
              <span className="app-help-label">Help</span>
            </Anchor>
          </Group>
          {authLoading ? (
            <Button size="xs" variant="default" disabled>
              Checking session
            </Button>
          ) : session ? (
            <Group className="app-header-actions" gap="sm">
              {sync.ready ? (
                <SyncStatusButton />
              ) : (
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  disabled
                  leftSection={<IconCloudUp aria-hidden="true" size={15} />}
                >
                  <span className="sync-status-label">Starting</span>
                </Button>
              )}
              <Button size="xs" component={Link} to="/export" variant="default">
                Export
              </Button>
              <Text component={Link} to="/profile" size="sm" c="dimmed">
                {session.user.email}
              </Text>
              <Button size="xs" variant="default" onClick={() => void signOut()}>
                Sign out
              </Button>
            </Group>
          ) : (
            <Group className="app-header-actions" gap="sm">
              <Button size="xs" component={Link} to="/export" variant="default">
                Export
              </Button>
              <Button size="xs" component={Link} to="/login" variant="default">
                Sign in
              </Button>
            </Group>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        {sync.error != null ? (
          <SyncStartupError error={sync.error} />
        ) : sync.ready ? (
          <LiveCanonicalScheduleProvider>
            <PublishedListDirectoryProvider>
              <Outlet />
            </PublishedListDirectoryProvider>
          </LiveCanonicalScheduleProvider>
        ) : (
          <SyncStartup checkingSession={authLoading} showSplash={sync.showSplash} status={sync.status} />
        )}
      </AppShell.Main>
      {sync.ready && <PwaStatus />}
    </AppShell>
  );
}

function SyncStartup({
  checkingSession,
  showSplash,
  status,
}: Pick<ReturnType<typeof useGenretvSyncLifecycle>, "showSplash" | "status"> & { checkingSession: boolean }) {
  return (
    <Center mih="calc(100vh - 104px - var(--mantine-spacing-md) * 2)">
      <Stack className={showSplash ? "loading-panel" : "loading-panel loading-panel-compact"} align="center" gap="xs">
        {showSplash && <LoadingSplash />}
        <Loader />
        <Text c="dimmed" size="sm">
          {checkingSession
            ? "Checking session…"
            : showSplash
              ? "Starting local database and canonical sync…"
              : "Updating local sync…"}
        </Text>
        {status != null && (
          <Text c="dimmed" size="xs">
            {status.phase}
          </Text>
        )}
      </Stack>
    </Center>
  );
}

function SyncStartupError({ error }: { error: Error }) {
  return (
    <Center mih="calc(100vh - 104px - var(--mantine-spacing-md) * 2)">
      <Stack className="loading-panel loading-panel-compact" align="center" gap="xs" maw={460}>
        <Text c="red" fw={600}>
          Could not start local sync
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          {error.message}
        </Text>
      </Stack>
    </Center>
  );
}

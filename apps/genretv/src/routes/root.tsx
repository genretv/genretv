import { Anchor, AppShell, Button, Group, Text } from "@mantine/core";
import { Link, Outlet } from "@tanstack/react-router";

import { useAuth } from "../auth/auth";

export function RootLayout() {
  const { session, signOut } = useAuth();
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
          </Group>
          {session ? (
            <Group className="app-header-actions" gap="sm">
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
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

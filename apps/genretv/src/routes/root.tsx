import { Anchor, AppShell, Button, Group, Text } from "@mantine/core";
import { Link, Outlet } from "@tanstack/react-router";

import { useAuth } from "../auth/auth";

export function RootLayout() {
  const { session, signOut } = useAuth();
  return (
    <AppShell header={{ height: 58 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="lg">
            <Anchor component={Link} to="/" underline="never" c="dark">
              <Text fw={800}>GenreTV</Text>
            </Anchor>
            <Anchor component={Link} to="/" size="sm">
              Schedule
            </Anchor>
            <Anchor component={Link} to="/manage" size="sm">
              Shows
            </Anchor>
          </Group>
          {session ? (
            <Group gap="sm">
              <Text size="sm" c="dimmed">
                {session.user.email}
              </Text>
              <Button size="xs" variant="default" onClick={() => void signOut()}>
                Sign out
              </Button>
            </Group>
          ) : (
            <Button size="xs" component={Link} to="/login" variant="default">
              Sign in
            </Button>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

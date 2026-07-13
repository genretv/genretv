import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useGenretvSyncStatus } from "../sync/sync-status";

export function PwaStatus() {
  const { loading, summary } = useGenretvSyncStatus();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (!offlineReady && !needRefresh && installPrompt == null) return null;

  const install = async () => {
    if (installPrompt == null) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <Paper className="pwa-status" shadow="lg" p="md" withBorder role="status" aria-live="polite">
      <Stack gap="xs">
        {needRefresh ? (
          <>
            <Text fw={700}>A GenreTV update is ready</Text>
            <Text size="sm">
              {loading
                ? "Checking for local changes before installing this update."
                : summary.total === 0
                  ? "Install it now or postpone it until later."
                  : "Synchronize or resolve local changes before installing this update."}
            </Text>
            <Group gap="xs" justify="flex-end">
              {summary.total > 0 && (
                <Button size="xs" variant="light" component={Link} to="/sync">
                  Review sync
                </Button>
              )}
              <Button size="xs" variant="default" onClick={() => setNeedRefresh(false)}>
                Later
              </Button>
              <Button size="xs" disabled={loading || summary.total > 0} onClick={() => void updateServiceWorker(true)}>
                Update
              </Button>
            </Group>
          </>
        ) : installPrompt != null ? (
          <Alert color="blue" variant="light" p="xs">
            <Group gap="sm" justify="space-between" wrap="nowrap">
              <Text size="sm">Install GenreTV for quicker access and offline use.</Text>
              <Button size="compact-xs" variant="light" onClick={() => void install()}>
                Install
              </Button>
            </Group>
          </Alert>
        ) : (
          <Alert color="teal" variant="light" p="xs">
            <Group gap="sm" justify="space-between" wrap="nowrap">
              <Text size="sm">GenreTV is available offline.</Text>
              <Button size="compact-xs" variant="subtle" onClick={() => setOfflineReady(false)}>
                Dismiss
              </Button>
            </Group>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

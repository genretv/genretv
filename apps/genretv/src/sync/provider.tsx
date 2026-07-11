import { createGenretvWorkerClient, type GenretvSyncClient } from "@genretv/offline-data/client";
import { SyncClientProvider } from "@genretv/offline-data/hooks";
import { bindCurrentGenretvStoreToUser, mappedGenretvStoreId } from "@genretv/offline-data/store-registry";
import { Center, Loader, Stack, Text } from "@mantine/core";
import type { Session } from "@supabase/supabase-js";
import { type ReactNode, useEffect, useRef, useState } from "react";

import type { AuthTokenSnapshot } from "@pgxsinkit/client";
import { syncDebug } from "@pgxsinkit/client";
import type { SyncRuntimeStatus } from "@pgxsinkit/contracts";

import { LoadingSplash } from "../components/loading-splash";
import { supabase } from "../lib/supabase";
import { GenretvSyncStatusProvider } from "./sync-status";
import { getGenretvWorkerPort } from "./worker-port";

export function GenretvSyncProvider({ children, session }: { children: ReactNode; session: Session | null }) {
  const [client, setClient] = useState<GenretvSyncClient | null>(null);
  const [status, setStatus] = useState<SyncRuntimeStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  const userId = session?.user.id ?? null;
  const mappedUserId = useRef(userId);
  const [storeSelection, setStoreSelection] = useState({ generation: 0, userId });

  useEffect(() => {
    let active = true;
    let created: GenretvSyncClient | undefined;
    setStatus(null);
    setError(null);

    void (async () => {
      try {
        if (typeof SharedWorker === "undefined") {
          throw new Error("This browser does not support SharedWorker, which GenreTV requires for local sync.");
        }
        syncDebug("boot genretv worker client create start", { signedIn: storeSelection.userId != null });
        const next = await createGenretvWorkerClient({
          userId: storeSelection.userId,
          getPort: getGenretvWorkerPort,
          getToken: currentTokenSnapshot,
          onStatusChange: (value) => {
            if (active) setStatus(value);
          },
        });
        next.setOnline(navigator.onLine);
        await localReadiness(next);
        if (!active) {
          void next.stop();
          return;
        }
        created = next;
        setStatus(next.status);
        setClient(next);
        setInitialSyncReady(true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    })();

    return () => {
      active = false;
      if (created) void created.stop();
    };
  }, [storeSelection]);

  useEffect(() => {
    if (client == null) return;
    if (userId == null && mappedUserId.current != null) {
      mappedUserId.current = null;
      setClient(null);
      setStoreSelection((current) => ({ generation: current.generation + 1, userId: null }));
      return;
    }
    if (userId != null && mappedUserId.current !== userId) {
      if (mappedGenretvStoreId(userId) != null) {
        mappedUserId.current = userId;
        setClient(null);
        setStoreSelection((current) => ({ generation: current.generation + 1, userId }));
        return;
      }
      bindCurrentGenretvStoreToUser(userId);
      mappedUserId.current = userId;
    }
    client?.notifyAuthChanged();
  }, [client, userId, session?.access_token, session?.expires_at]);

  useEffect(() => {
    if (client == null) return;
    const updateConnectivity = () => client.setOnline(navigator.onLine);
    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, [client]);

  if (error != null) {
    return (
      <Center h="100vh">
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

  if (client == null) {
    const showSplash = !initialSyncReady;
    return (
      <Center h="100vh">
        <Stack className={showSplash ? "loading-panel" : "loading-panel loading-panel-compact"} align="center" gap="xs">
          {showSplash && <LoadingSplash />}
          <Loader />
          <Text c="dimmed" size="sm">
            {showSplash ? "Starting local database and canonical sync…" : "Updating local sync…"}
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

  return (
    <SyncClientProvider client={client}>
      <GenretvSyncStatusProvider runtime={status ?? client.status}>{children}</GenretvSyncStatusProvider>
    </SyncClientProvider>
  );
}

async function currentTokenSnapshot(): Promise<AuthTokenSnapshot | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session?.access_token == null) return null;
  return { accessToken: session.access_token, expiresAt: (session.expires_at ?? 0) * 1000 };
}

async function localReadiness(client: GenretvSyncClient): Promise<void> {
  const localReady = (client as GenretvSyncClient & { localReady?: Promise<void> }).localReady;
  await (localReady ?? client.ready);
}

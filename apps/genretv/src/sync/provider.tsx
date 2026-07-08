import { Center, Loader, Stack, Text } from "@mantine/core";
import type { Session } from "@supabase/supabase-js";
import { type ReactNode, useEffect, useState } from "react";

import { createGenretvWorkerClient, type GenretvSyncClient } from "@genretv/offline-data/client";
import { SyncClientProvider } from "@genretv/offline-data/hooks";
import type { AuthTokenSnapshot } from "@pgxsinkit/client";
import { syncDebug } from "@pgxsinkit/client";
import type { SyncRuntimeStatus } from "@pgxsinkit/contracts";

import { LoadingSplash } from "../components/loading-splash";
import { supabase } from "../lib/supabase";
import { getGenretvWorkerPort } from "./worker-port";

export function GenretvSyncProvider({ children, session }: { children: ReactNode; session: Session | null }) {
  const [client, setClient] = useState<GenretvSyncClient | null>(null);
  const [status, setStatus] = useState<SyncRuntimeStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    let created: GenretvSyncClient | undefined;
    setClient(null);
    setStatus(null);
    setError(null);

    void (async () => {
      try {
        if (typeof SharedWorker === "undefined") {
          throw new Error("This browser does not support SharedWorker, which GenreTV requires for local sync.");
        }
        syncDebug("boot genretv worker client create start", { signedIn: userId != null });
        const next = await createGenretvWorkerClient({
          userId,
          getPort: getGenretvWorkerPort,
          getToken: currentTokenSnapshot,
          onStatusChange: (value) => {
            if (active) setStatus(value);
          },
        });
        await next.ready;
        if (!active) {
          void next.stop();
          return;
        }
        created = next;
        setStatus(next.status);
        setClient(next);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    })();

    return () => {
      active = false;
      if (created) void created.stop();
    };
  }, [userId]);

  if (error != null) {
    return (
      <Center h="100vh">
        <Stack className="loading-panel" align="center" gap="xs" maw={460}>
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
    return (
      <Center h="100vh">
        <Stack className="loading-panel" align="center" gap="xs">
          <LoadingSplash />
          <Loader />
          <Text c="dimmed" size="sm">
            Starting local database and canonical sync…
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

  return <SyncClientProvider client={client}>{children}</SyncClientProvider>;
}

async function currentTokenSnapshot(): Promise<AuthTokenSnapshot | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session?.access_token == null) return null;
  return { accessToken: session.access_token, expiresAt: (session.expires_at ?? 0) * 1000 };
}

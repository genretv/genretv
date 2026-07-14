import { createGenretvWorkerClient, type GenretvSyncClient } from "@genretv/offline-data/client";
import { SyncClientProvider } from "@genretv/offline-data/hooks";
import { bindCurrentGenretvStoreToUser, mappedGenretvStoreId } from "@genretv/offline-data/store-registry";
import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { AuthTokenSnapshot } from "@pgxsinkit/client";
import { syncDebug } from "@pgxsinkit/client";
import type { SyncRuntimeStatus } from "@pgxsinkit/contracts";

import { supabase } from "../lib/supabase";
import { AuthenticatedWorkflowSync } from "./authenticated-workflow-sync";
import { GenretvSyncStatusProvider } from "./sync-status";
import { getGenretvWorkerPort } from "./worker-port";

interface GenretvSyncLifecycle {
  error: Error | null;
  ready: boolean;
  showSplash: boolean;
  status: SyncRuntimeStatus | null;
}

const GenretvSyncLifecycleContext = createContext<GenretvSyncLifecycle | null>(null);

export function GenretvSyncProvider({
  authReady,
  children,
  session,
}: {
  authReady: boolean;
  children: ReactNode;
  session: Session | null;
}) {
  const [client, setClient] = useState<GenretvSyncClient | null>(null);
  const [status, setStatus] = useState<SyncRuntimeStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  const userId = session?.user.id ?? null;
  const mappedUserId = useRef(userId);
  const [storeSelection, setStoreSelection] = useState<{ generation: number; userId: string | null | undefined }>(
    () => ({ generation: 0, userId: authReady ? userId : undefined }),
  );

  useEffect(() => {
    if (!authReady || storeSelection.userId !== undefined) return;
    mappedUserId.current = userId;
    setStoreSelection((current) => ({ generation: current.generation + 1, userId }));
  }, [authReady, storeSelection.userId, userId]);

  useEffect(() => {
    const selectedUserId = storeSelection.userId;
    if (selectedUserId === undefined) return;
    let active = true;
    let created: GenretvSyncClient | undefined;
    setStatus(null);
    setError(null);

    void (async () => {
      try {
        if (typeof SharedWorker === "undefined") {
          throw new Error("This browser does not support SharedWorker, which GenreTV requires for local sync.");
        }
        syncDebug("boot genretv worker client create start", { signedIn: selectedUserId != null });
        const next = await createGenretvWorkerClient({
          userId: selectedUserId,
          getPort: getGenretvWorkerPort,
          getToken: currentTokenSnapshot,
          onStatusChange: (value) => {
            if (active) setStatus(value);
          },
        });
        next.setOnline(navigator.onLine);
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

  const lifecycle = useMemo(
    () => ({ error, ready: client != null, showSplash: !initialSyncReady, status }),
    [client, error, initialSyncReady, status],
  );

  return (
    <GenretvSyncLifecycleContext.Provider value={lifecycle}>
      {client == null ? (
        children
      ) : (
        <SyncClientProvider client={client}>
          <AuthenticatedWorkflowSync active={session != null} />
          <GenretvSyncStatusProvider runtime={status ?? client.status} monitorMutations={session != null}>
            {children}
          </GenretvSyncStatusProvider>
        </SyncClientProvider>
      )}
    </GenretvSyncLifecycleContext.Provider>
  );
}

export function useGenretvSyncLifecycle(): GenretvSyncLifecycle {
  const value = useContext(GenretvSyncLifecycleContext);
  if (value == null) throw new Error("useGenretvSyncLifecycle must be used within GenretvSyncProvider");
  return value;
}

async function currentTokenSnapshot(): Promise<AuthTokenSnapshot | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session?.access_token == null) return null;
  return { accessToken: session.access_token, expiresAt: (session.expires_at ?? 0) * 1000 };
}

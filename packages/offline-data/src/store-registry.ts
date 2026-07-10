export interface GenretvStoreClaim {
  fresh: boolean;
  storeId: string;
  storePath: string;
}

interface StoreRegistryState {
  spareStoreId: string;
  userStores: Record<string, string>;
  version: 1;
}

const storageKey = "genretv.sync.stores.v1";
const storePrefix = "pgxsinkit-genretv-";

export function storePathForStore(storeId: string): string {
  return `${storePrefix}${storeId}`;
}

export function claimGenretvStore(userId: string | null): GenretvStoreClaim {
  const state = readState();
  if (userId == null) {
    writeState(state);
    return { storeId: state.spareStoreId, storePath: storePathForStore(state.spareStoreId), fresh: false };
  }

  const existing = state.userStores[userId];
  if (existing != null) {
    writeState(state);
    return { storeId: existing, storePath: storePathForStore(existing), fresh: false };
  }

  const claimed = state.spareStoreId;
  const nextSpare = randomStoreId();
  writeState({
    version: 1,
    spareStoreId: nextSpare,
    userStores: { ...state.userStores, [userId]: claimed },
  });
  return { storeId: claimed, storePath: storePathForStore(claimed), fresh: true };
}

export function bindCurrentGenretvStoreToUser(userId: string): string {
  const state = readState();
  const existing = state.userStores[userId];
  if (existing != null) {
    writeState(state);
    return existing;
  }

  const claimed = state.spareStoreId;
  writeState({
    version: 1,
    spareStoreId: randomStoreId(),
    userStores: { ...state.userStores, [userId]: claimed },
  });
  return claimed;
}

function readState(): StoreRegistryState {
  const parsed = readStoredState();
  if (parsed != null) return parsed;
  const state = { version: 1, spareStoreId: randomStoreId(), userStores: {} } satisfies StoreRegistryState;
  writeState(state);
  return state;
}

function readStoredState(): StoreRegistryState | null {
  try {
    const raw = globalThis.localStorage.getItem(storageKey);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as Partial<StoreRegistryState>;
    if (parsed.version !== 1 || typeof parsed.spareStoreId !== "string" || parsed.userStores == null) return null;
    const userStores: Record<string, string> = {};
    for (const [userId, storeId] of Object.entries(parsed.userStores)) {
      if (typeof storeId === "string") userStores[userId] = storeId;
    }
    return { version: 1, spareStoreId: parsed.spareStoreId, userStores };
  } catch {
    return null;
  }
}

function writeState(state: StoreRegistryState): void {
  globalThis.localStorage.setItem(storageKey, JSON.stringify(state));
}

function randomStoreId(): string {
  return globalThis.crypto.randomUUID();
}

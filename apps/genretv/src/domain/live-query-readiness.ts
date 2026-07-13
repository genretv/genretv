export interface LiveQueryReadiness {
  hydrating: boolean;
  loading: boolean;
}

export interface LiveAggregateState {
  empty: boolean;
  loading: boolean;
}

export function liveAggregateState(
  queries: readonly LiveQueryReadiness[],
  hasUsableSnapshot: boolean,
): LiveAggregateState {
  const loadingLocalSnapshot = queries.some((query) => query.loading);
  const hydrating = queries.some((query) => query.hydrating);

  return {
    loading: loadingLocalSnapshot || (!hasUsableSnapshot && hydrating),
    empty: !loadingLocalSnapshot && !hydrating && !hasUsableSnapshot,
  };
}

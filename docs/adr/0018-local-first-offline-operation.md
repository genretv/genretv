# Local-First Offline Operation

GenreTV is a local-first Progressive Web App. After one successful online installation and Canonical List
hydration, the application shell and previously synchronized data remain usable without a network connection.
Every supported domain mutation commits first to the mapped PGlite store and pgxsinkit's durable optimistic
Mutation journal. GenreTV has no pessimistic domain-write path.

SharedWorker support remains a browser requirement. Compatibility fallbacks for browsers without SharedWorker
are outside the product boundary.

## Readiness and freshness

Local readiness and server freshness are separate properties:

- GenreTV renders after the worker client attaches. A successful `attachSyncClient` call means PGlite, the
  local schema, recovered Mutation journal, and locally readable relations are available; it does not await
  `client.ready`.
- pgxsinkit's existing `ready` contract continues to represent initial synchronization with the server.
- Returning users may therefore read stale persisted data while offline or while catch-up is running.
- Reactive Drizzle reads use `hydrating` to distinguish synchronization from a genuine empty result. Cached
  rows render immediately while hydration continues; an empty state is authoritative only after both the
  local query snapshot and hydration settle.
- This rule applies to every user-visible count, empty state, and not-found state, including management,
  publishing, profiles, and hidden rows. Local Mutation-journal queries similarly suppress synchronized and
  zero-change claims until their first local snapshots complete.
- A lazy-persisted relation that was previously hydrated may render its cached rows offline. One that has never
  been hydrated must report that it is unavailable offline, not masquerade as an empty result.
- First use still requires a network connection because no application or Canonical List cache exists yet.

The provider must not await `client.ready`: a cold worker cannot reach that server-current milestone while
offline even when its mapped PGlite store contains usable cached data.

## Writes and convergence

All GenreTV registry entries that accept writes use `writeMode: "optimistic"`, and application transactions use
the optimistic mode. A successful save message means the write is durable in the local store and journal. It
does not claim that the server has accepted or published the change.

The worker receives browser online/offline events through `setOnline`. While offline, local transactions continue
to enqueue but the worker does not attempt network convergence. Reconnection resumes Electric reads and journal
flushes. Ordinary pages read the overlay-composed local relations, so queued changes remain visible across
reloads and browser restarts.

Existing `reject-if-stale` conflict policies remain. Conflicted and quarantined mutations retain actionable
local state until the user resolves or discards it. GenreTV exposes aggregate synchronization state in the
application header and a signed-in Synchronization page with journal detail, retry actions, and explicit discard
actions. The UI distinguishes synchronized, pending, delayed/offline, conflicted, and quarantined states.

Signing out never deletes or clears a mapped store. It can contain private synchronized data and unsynchronized
work. Removing that store is an explicit browser site-storage action.

## Application installation and updates

The production build generates a service worker and root-scoped web-app manifest. The service worker precaches
the application shell and the runtime assets needed to open PGlite and its workers. The documentation subtree is
not treated as an application navigation fallback and uses its own runtime cache policy.

Installation and updates are user-mediated:

- the browser's install capability is surfaced when available;
- a waiting application update is announced rather than activated silently;
- update/reload is disabled while non-terminal local mutations exist, preventing an avoidable interruption to
  work awaiting synchronization;
- signed-in use requests persistent browser storage once, while respecting a denial;
- the database-export implementation remains action-loaded by application code, while the service worker may
  cache its revisioned assets after startup so exports remain available offline.

## Explicit online-only boundaries

Authentication and external services remain online operations: sign-up, sign-in, password recovery, session
refresh, first hydration of a lazy relation, external links, and making queued work visible to another user or
device. Their offline states must be explicit and must not imply data loss.

## Verification

The app build has a contract check for manifest scope, required PWA icons, worker/runtime assets, PGlite assets,
and service-worker routing. A dedicated Playwright suite runs the production build against isolated
infrastructure and proves:

1. an installed, hydrated anonymous app can reload and show the Canonical List offline;
2. an authenticated optimistic write survives an offline reload and converges after reconnection.

The offline suite is a release gate once the minimum pgxsinkit version supplies the local-readiness and stale
persisted-read contracts described above.

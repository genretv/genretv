# Fully Offline-Capable GenreTV

## Status

Planned. This document is implementation guidance, not a description of currently deployed behavior.

GenreTV will become a local-first PWA in which a returning visitor can open previously synchronized data
without a network connection and an authenticated user can make every supported domain mutation locally.
All domain writes will use pgxsinkit's durable optimistic journal. GenreTV will have no pessimistic mutation
path.

SharedWorker compatibility is not part of this work. GenreTV continues to require a current browser with
SharedWorker support.

## Product Boundary

For this plan, **fully offline-capable** means:

- After one successful online load, the application shell can start without network access.
- Previously synchronized Canonical List data remains browsable offline.
- A returning authenticated user can reopen their Mapped Store and use previously synchronized personal,
  publishing, and maintainer data offline.
- Every supported create, update, delete, import, publish, proposal, and review action commits first to the
  local PGlite database and durable mutation journal.
- The UI immediately reflects locally committed optimistic state and distinguishes it from server-synchronized
  state.
- Local mutations survive page reload, browser restart, and an extended offline period.
- Reconnection resumes Electric reads and flushes queued mutations without requiring the user to repeat them.
- Failed, conflicted, and permanently rejected writes remain visible and recoverable until the user resolves or
  discards them.
- Signing out never deletes a Mapped Store or its unsynchronized mutations.

The following cannot work offline and must have explicit states rather than misleading failures:

- first-ever use before the application shell and Canonical List have been installed;
- sign-up, sign-in, password recovery, password changes, and authoritative session refresh;
- loading a lazy public or personal shape that has never previously been synchronized;
- making locally queued work visible to another device or user before reconnection;
- following external IMDb, Wikipedia, platform, or studio links;
- recovering data after the user or browser explicitly deletes GenreTV site storage.

An expired or stale cached authorization token may identify the Mapped Store and permit local authoring. It never
authorizes a server write: Supabase and PostgreSQL RLS remain authoritative when the mutation eventually flushes.

## Architectural Decisions

### 1. Local-ready and server-current are different states

pgxsinkit currently resolves `client.ready` only after eager shapes have completed initial synchronization. That
is correct for a server-current guarantee but prevents a returning offline user from opening a valid persistent
cache.

pgxsinkit exposes local readiness through successful worker attachment instead of weakening the existing
`ready` guarantee:

- `attachSyncClient` resolves after PGlite opens, local schema reconciliation completes, journal recovery
  completes, and locally readable relations are available.
- `ready` continues to mean that all eager groups are synchronized to the server-current frontier.
- Worker-attached and in-process clients expose equivalent readiness and status behavior.
- GenreTV renders after worker attachment; it does not wait for `ready` when cached data is usable.
- Runtime status reports local readiness, connectivity, synchronization activity, and freshness independently.

### 2. Persistent cached reads are allowed while stale

The guarded-query safety net currently activates a lazy relation and waits for its first synchronized result.
For local-first operation, pgxsinkit must distinguish these cases:

| Relation state                          | Online behavior                      | Offline behavior                        |
| --------------------------------------- | ------------------------------------ | --------------------------------------- |
| Eager and previously hydrated           | render cache, catch up in background | render cache as stale                   |
| Lazy persistent and previously hydrated | render cache, resume/catch up        | render cache as stale                   |
| Lazy persistent, never hydrated         | activate and await first sync        | typed unavailable-offline result        |
| Ephemeral                               | activate and await current delivery  | unavailable offline                     |
| Fresh store with no Canonical List      | perform initial sync                 | explicit first-use-needs-network screen |

A dormant relation must never be presented as an authoritative empty list merely because no local rows exist.
pgxsinkit needs a durable hydration marker and a typed unavailable-offline outcome for that distinction.

### 3. Every domain write is optimistic

All writable GenreTV Sync Registry Entries will use `writeMode: "optimistic"`. Every explicit write transaction
will use optimistic mode. There are no business invariants in GenreTV that justify foreground server authority.
PostgreSQL constraints and RLS still decide whether queued writes are ultimately accepted.

An optimistic transaction means:

1. validate and collect the write unit locally;
2. commit its overlay and journal rows atomically in PGlite;
3. update live queries immediately from the read-model views;
4. return success to the caller as **saved locally**;
5. flush in the background when connectivity permits;
6. clear optimistic state only after the acknowledged server version returns through Electric.

Changing static write mode is runtime routing and is excluded from pgxsinkit's registry fingerprint. The mode
change itself requires no PostgreSQL or local-store migration. Generated sync artifacts must still be checked.

### 4. Reject stale edits rather than silently overwrite them

`reject-if-stale` remains the default conflict policy for editable domain records. A stale offline edit keeps its
overlay visible and becomes a user-resolvable conflict. GenreTV will not silently choose the last device to
reconnect.

`last-write-wins` may be considered later for idempotent convenience state, such as marking a notification read,
but it is not required for this implementation. The initial conversion keeps the existing policies and builds a
complete conflict surface.

### 5. Connectivity controls attempts, not local capability

The browser forwards its initial `navigator.onLine` value and subsequent `online` and `offline` events to the
SharedWorker through `client.setOnline()`:

- offline closes the outbound convergence gate immediately;
- local writes continue entering the journal;
- online reopens the gate and requests one immediate convergence pass;
- the existing interval remains only a retry/recovery fallback.

`navigator.onLine` is a hint, not proof that Supabase or Electric is reachable. Transport failures therefore use
pgxsinkit's durable backoff and are surfaced in the Sync Center. GenreTV must not run an app-level retry loop or
reset retry deadlines automatically.

### 6. The local database is important user storage

After the first authenticated Store Takeover or PWA installation, GenreTV requests persistent browser storage
through `navigator.storage.persist()`. The result is recorded for diagnostics and explained in end-user help.
Refusal does not disable offline use, because browsers may still retain ordinary IndexedDB storage.

The complete local-store export remains the lossless backup for a device with pending writes. Portable data
exports continue to enforce pgxsinkit's journal drain rules where applicable.

### 7. Application updates never silently discard intent

Service-worker updates use a prompt flow rather than unconditional `skipWaiting` plus reload. Before accepting an
update, GenreTV checks local mutation diagnostics:

- a clean journal can update immediately;
- pending or retryable writes produce a clear recommendation to reconnect and synchronize first;
- conflicts or quarantined writes link to the Sync Center;
- the user may postpone the update without losing use of the currently installed application.

Offline clients can remain on old code for an unbounded period. Registry and server changes therefore follow
pgxsinkit's expand/contract discipline. A deployment must remain compatible with old queued mutations for the
supported offline window; no release may rename, remove, or repurpose a writable field in one step.

## Current GenreTV Changes

### Registry conversion

Convert every writable entry in `packages/domain/src/schema.ts`:

| Consistency group     | Tables                                                                                     | Target mode |
| --------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| `canonical-schedule`  | `canonical_show`, `canonical_season`, `canonical_episode`                                  | optimistic  |
| `personal-overlay`    | `personal_show`, `personal_season`, `personal_episode`, `personal_list_exclusion`          | optimistic  |
| `user-workspace`      | `user_profile`                                                                             | optimistic  |
| `publishing`          | `published_list`, `published_show`, `published_season`, `published_episode`, `list_import` | optimistic  |
| `maintainer-workflow` | `publish_application`, `canonical_proposal`, `maintainer_notification`                     | optimistic  |

Keep all groups persistent. Canonical data remains eager; the other groups remain lazy persistent.

### Mutation call-site conversion

Replace every `transaction({ mode: "pessimistic" })` with an optimistic write unit. Remove
`assertTransactionAcked` and its tests once no call site needs an immediate transport acknowledgement.

Create one small application mutation wrapper rather than reproducing state wording in every route. It should:

- enqueue an optimistic transaction;
- report local enqueue validation failures to the invoking form;
- return after the durable local transaction commits;
- use consistent **Saved locally** copy;
- leave transport, conflict, and quarantine reporting to the global synchronization model;
- never catch a background synchronization error and convert it into a false local-save failure.

Apply the wrapper to:

- Show, Season, and Episode create/edit/delete;
- automatic first Season creation for a new Show;
- hiding and restoring canonical entries;
- linked import, detached copy, link removal, and dependent child creation;
- profile creation and editing;
- publisher applications;
- canonical proposal submission;
- published snapshot creation;
- application and proposal review;
- canonical proposal merge, including parent creation;
- notification read state.

Existing editor drafts remain useful for in-progress form recovery. A draft is cleared after the mutation is
durably enqueued locally, not after server synchronization.

### Local success language

Replace acknowledgement-oriented UI language consistently:

| Current implication                          | Replacement                                                           |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `Saved.`                                     | `Saved locally.`                                                      |
| `Published snapshot saved.`                  | `Publication queued.` or `Published locally; waiting to synchronize.` |
| `Sent to the canonical maintainers.`         | `Proposal saved locally and queued for the maintainers.`              |
| `Profile saved.`                             | `Profile saved locally.`                                              |
| foreground progress by server mutation count | local preparation/enqueue progress only                               |

Once the journal converges, the global status may say **All changes synchronized**. Individual forms do not need
to wait open for that transition.

## Publishing Without Blind Updates

The existing snapshot flow creates draft rows through pessimistic transactions, then calls `updateBlind` because
the acknowledged rows may not yet have returned through Electric. `updateBlind` is pessimistic-only and must be
removed.

The owner-or-public read filters already make draft rows visible to their owner. Under optimistic creation, each
draft exists immediately in the owner's local read model, so an ordinary optimistic `update` can change its
publication status.

The new flow is:

1. Build a complete snapshot plan locally with client-generated UUIDs and the next snapshot version.
2. Enqueue the draft list if it does not already exist.
3. Enqueue all draft Shows, Seasons, and Episodes.
4. Change those locally visible rows to `published` with ordinary updates.
5. Update the `published_list` title, description, status, and snapshot version last.
6. Report the publication as locally queued.

Presentation remains version-gated:

- public list queries render only rows matching the published list's active `snapshotVersion`;
- publishing the list version is the final visibility switch;
- children from an incomplete or failed new snapshot cannot replace the previous public snapshot;
- orphaned draft or inactive-version rows can be cleaned up by a later explicit maintenance operation, never by
  silently deleting pending local intent.

This ordering must be tested with a snapshot larger than pgxsinkit's HTTP flush batch size so presentation does
not depend on one request containing the entire publication.

## Synchronization UX

### Global indicator

Add a compact status control to the authenticated application header. It opens the Sync Center and uses these
states:

| State                               | Meaning                                            | Suggested label   |
| ----------------------------------- | -------------------------------------------------- | ----------------- |
| current, clean journal              | server-current and no owed writes                  | `Synchronized`    |
| offline, clean journal              | cached data available                              | `Offline`         |
| pending/sending/acked-awaiting-echo | local work is owed or converging                   | `Changes pending` |
| syncing stale reads                 | cached data shown while catching up                | `Updating`        |
| retryable failure                   | backoff is active                                  | `Sync delayed`    |
| conflict                            | stale local edit needs a decision                  | `Conflict`        |
| quarantine                          | server cannot accept a queued write                | `Sync issue`      |
| auth needed                         | token must be refreshed or user must sign in again | `Sign in to sync` |

The indicator must not imply that `navigator.onLine === true` means synchronized.

### Sync Center

Add an authenticated `/sync` route backed by pgxsinkit diagnostics, mutation details, and generated sync-state
views. It shows:

- connectivity and read freshness;
- pending, sending, acknowledged-awaiting-echo, failed, conflicted, and quarantined counts;
- mutation rows grouped by entity and ordered by local mutation sequence;
- human-readable table/entity labels where the corresponding read-model row still exists;
- last error, HTTP status, attempt count, and next retry time;
- **Retry now** for retryable failed writes through `retryFailed`;
- **Use server version** for conflicts through `discardConflict`;
- **Discard local change** for quarantined writes through `discardQuarantined`;
- **Edit and reapply** for conflicts or rejected values by navigating to the relevant editor and creating a new
  mutation;
- a full local database export action before destructive resolution.

Mutation status should be reactive. Prefer live Drizzle queries over pgxsinkit's generated sync-state views. Do
not poll PGlite. If worker-safe reactive aggregate diagnostics are missing upstream, add that typed surface to
pgxsinkit rather than issuing raw SQL from GenreTV.

### Entity-level state

Management rows and editors should show a small pending/conflict/error marker when their entity has unsettled
local state. The global Sync Center owns detailed actions; editors may link to the relevant issue. Optimistic
deletes disappear from normal views immediately but remain discoverable in the Sync Center until synchronized or
discarded.

## PWA Application Shell

### Build integration

Use the current stable `vite-plugin-pwa` with the `injectManifest` strategy. A custom service worker is required
for explicit route boundaries, large PGlite assets, update gating, and runtime cache policy.

Add a production web app manifest containing:

- `name` and `short_name`;
- root `start_url` and scope;
- `standalone` display;
- GenreTV theme and background colors;
- 192px and 512px icons;
- maskable icon variants;
- an Apple touch icon in `index.html`.

Do not register the production service worker during normal Vite development. Offline E2E runs against a built
preview.

### Precache policy

Precache the minimum complete GenreTV runtime atomically:

- root `index.html`;
- revisioned application JavaScript and CSS;
- the GenreTV SharedWorker bundle;
- PGlite `pglite.wasm`, filesystem data, and `initdb.wasm`;
- the web app manifest and application icons;
- optimized background and splash formats required by the installed app;
- pgxsinkit/PGlite export chunks and `pg_dump.wasm`, so the implemented database exports remain available
  offline.

The PGlite WASM and data files exceed Workbox's default per-file precache threshold. Configure an explicit size
large enough for the measured build artifacts and add a build test that fails when an essential asset is omitted.
Do not silently ignore Workbox size warnings.

Service-worker installation happens in the background and does not gate the first online render. GenreTV may
show **Available offline** only after the worker reports successful installation of the complete revision.

### Fetch policy

| Request                          | Strategy                                       |
| -------------------------------- | ---------------------------------------------- |
| revisioned application assets    | precache/cache-first                           |
| root navigation/hash routes      | cached application shell with network update   |
| Supabase Auth and Edge Functions | network-only                                   |
| Electric shape requests          | network-only                                   |
| external links and media         | normal browser/network behavior                |
| `/docs/` navigation              | network-first with visited-page cache fallback |
| documentation assets             | stale-while-revalidate/runtime cache           |

The root service worker must never return the React application shell for `/docs/`. Production uses hash routing,
so application route navigations normally request `/` and do not require physical route files on GitHub Pages.

Cache names include an application revision. Activation deletes only obsolete GenreTV Cache Storage entries; it
must never touch IndexedDB/PGlite storage.

## Authentication and Store Selection

Supabase remains the identity authority. GenreTV adds a narrow local-session interpretation:

- a cached Supabase session selects the user's existing Mapped Store while offline;
- token expiry does not delete, rename, or remap that store;
- local edits may continue and are clearly marked pending;
- auth refresh is attempted on reconnect;
- 401/403 writes remain retryable while a refresh can recover them;
- if reauthentication is required, the journal remains untouched and the UI offers sign-in to resume sync;
- a confirmed sign-out switches to the Anonymous/Public Spare Store but retains the user's Mapped Store.

Test the actual Supabase client behavior for an expired cached session while offline. If Supabase emits a signed-out
event after a refresh transport failure, preserve the last mapped user identity separately from authorization and
show **Sign in to sync**. Do not copy access tokens into a second application store.

Local data is not a security boundary against someone with access to the same browser profile. This plan preserves
data across offline auth expiry; it does not add local encryption or a device PIN.

## Upstream pgxsinkit Work

Implement and release the following in the pgxsinkit repository before GenreTV consumes it:

1. Write an ADR for local-ready versus server-current readiness.
2. Add worker/in-process parity for local readiness and stale persistent reads.
3. Persist enough hydration state to distinguish cached-empty from never-synchronized.
4. Add a typed offline-unavailable result for a never-hydrated or ephemeral relation.
5. Let previously hydrated persistent lazy groups serve local queries while catch-up starts in the background.
6. Ensure a reconnect resumes read streams and requests write convergence without recreating the store.
7. Expose connectivity/freshness status without conflating it with mutation diagnostics.
8. Provide a worker-safe reactive mutation-status surface if generated sync-state views cannot be subscribed to
   cleanly through the existing live Drizzle bridge.
9. Cover offline boot, lazy cached reads, never-hydrated reads, restart with pending writes, reconnect, and
   multi-tab worker attachment in upstream tests.
10. Update pgxsinkit Agent Skills and `llms.txt` with the final API and semantics.

Do not add GenreTV-layer raw-query or direct-PGlite workarounds for missing pgxsinkit functionality. Publish the
upstream change, run `bun run dev:bump`, reload the installed skills, and then implement the consumer side.

## Implementation Slices

### Slice 1: Record contracts and establish tests

- Add a GenreTV ADR accepting local-first readiness, all-optimistic writes, conflict surfacing, and PWA caching.
- Add failing GenreTV contract tests asserting that every writable registry entry is optimistic.
- Add failing tests asserting there are no pessimistic transactions or acknowledgement helper imports.
- Add upstream pgxsinkit tests for local-ready and stale persistent reads.
- Capture current production bundle asset names/sizes in build-level assertions rather than hard-coded hashes.

### Slice 2: Implement pgxsinkit local-first startup

- Implement the upstream readiness, stale-read, hydration, and status contract.
- Verify in-process and SharedWorker parity.
- Publish and bump GenreTV to the new pgxsinkit build.
- Adapt `GenretvSyncProvider` to render on local readiness and expose freshness/connectivity through context.
- Add explicit first-use-offline and cached-offline loading states.

### Slice 3: Convert ordinary GenreTV mutations

- Change registry write modes.
- Introduce the local mutation wrapper and common result language.
- Convert personal Show, Season, Episode, exclusion, import, and profile workflows.
- Remove immediate ack assumptions and browser-local draft retention after successful local enqueue.
- Wire `client.setOnline()` to browser connectivity events.
- Verify queued mutations survive reload and reconnect before converting privileged workflows.

### Slice 4: Convert publishing and maintainer workflows

- Convert applications, proposals, notifications, canonical edits, and merges.
- Replace publishing blind updates with locally visible ordinary updates.
- Preserve active-snapshot version gating and final-list-switch ordering.
- Add large-snapshot, interrupted-flush, role denial, duplicate, and stale-review tests.

### Slice 5: Build synchronization UX

- Add reactive mutation/freshness state.
- Add the header indicator and `/sync` route.
- Implement retry, discard conflict, discard quarantine, and edit/reapply navigation.
- Add entity-level pending/error markers.
- Ensure complete local-store export is available before destructive resolution.

### Slice 6: Install the PWA shell

- Add the service worker, manifest, and generated icons.
- Configure essential precache assets and route strategies.
- Exclude `/docs/` from the SPA fallback.
- Add service-worker update prompting guarded by mutation diagnostics.
- Request and report persistent storage.
- Add an offline-readiness indicator without blocking the online application startup.

### Slice 7: Prove offline behavior end to end

- Add a production-build Playwright configuration with its own port and the isolated E2E compose stack.
- Use a persistent browser profile under `tmp/agents/` so IndexedDB, Cache Storage, auth storage, and service-worker
  state survive context restart.
- Run the complete offline and conflict matrix below.
- Update end-user documentation only after each behavior is implemented and verified.
- Run `bun run validate:full` and a production `bun run build:site` before deployment.

## Test Matrix

### App-shell and cached reads

- Online first visit installs the service worker and reports offline readiness.
- Offline reload renders the Canonical List from PGlite.
- Offline installed-app launch renders without any successful HTTP request.
- A previously visited public list renders offline.
- An unvisited public list reports that it must be loaded online, not an empty list.
- A returning user's activated Personal List renders offline.
- A fresh browser profile opened offline reports that first use requires connectivity.
- `/docs/` is never served the React shell; a visited help page can fall back to its runtime cache.

### Durable optimistic writes

- Offline create/update/delete is visible immediately through each read-model view.
- Parent Show plus automatic Season creation commits locally as one unit.
- Season plus Episode creation preserves dependency ordering on flush.
- Hide and restore work offline.
- Linked import, remove link, and detached copy work offline.
- Profile edits and slug changes queue offline.
- Browser/page restart preserves every pending mutation and overlay.
- Reconnect flushes the journal and Electric echo clears the overlay without visual rollback.
- A second authenticated context observes the server result after convergence.

### Publishing and maintainer workflows

- Publisher application queues offline and appears locally as open.
- Proposal submission queues offline with attached parent identifiers.
- Maintainer reject/close/approve+merge queues offline.
- Canonical parent Show/Season creation plus child merge preserves order.
- A publication larger than one HTTP flush batch never presents a mixed snapshot.
- Interrupted publication retains the previous active snapshot publicly.
- Reconnect completes the new snapshot and anonymous clients switch only at the list version update.

### Failure and recovery

- Going offline does not consume mutation attempts while the worker gate is closed.
- A transient network/5xx failure appears as delayed and retries after backoff or explicit **Retry now**.
- A stale update keeps the local overlay and appears as a conflict.
- **Use server version** removes the conflicted overlay.
- Editing and reapplying creates a new mutation against the current server version.
- Unique slug or duplicate-row rejection becomes quarantined with a useful explanation.
- Discarding a quarantined create removes its phantom optimistic row.
- A later mutation blocked behind a terminal entity is explained in the Sync Center.
- Expired offline auth keeps local data and queued writes; successful reauthentication resumes sync.
- Sign-out leaves the Mapped Store and pending journal intact while anonymous mode uses a different store.

### Updates and storage

- A waiting service-worker revision does not reload automatically.
- A clean store can accept and activate an update.
- Pending/conflicted/quarantined state produces the correct update warning and remains intact after postponement.
- Essential PGlite and worker assets are present in the installed revision cache.
- An offline complete local-database export succeeds.
- Cache cleanup does not remove IndexedDB/PGlite stores.

## Documentation Updates

After implementation, update the end-user documentation to remove all pessimistic-write language and explain:

- **Saved locally** versus **Synchronized**;
- what data is available offline;
- why first use, unvisited public lists, and authentication require connectivity;
- the header synchronization indicator and Sync Center;
- retrying, resolving, and discarding local changes;
- local storage persistence and browser deletion behavior;
- installing GenreTV as an app;
- exporting the local database before destructive conflict resolution;
- delayed visibility of queued publishing and maintainer actions to other users.

Update the implementation brief and ADR-0009 so they describe optimistic writes as implemented rather than merely
intended. Keep the public documentation accuracy boundary: do not publish these instructions before the complete
behavior passes E2E.

## Deployment and Rollout

1. Deploy upstream pgxsinkit support and consume it in GenreTV.
2. Deploy optimistic writes and Sync Center before enabling the service worker, so terminal states are already
   recoverable when offline queuing begins.
3. Deploy the PWA shell with a new GenreTV release revision and verify GitHub Pages serves `sw.js` at the root with
   a root scope.
4. Verify Supabase and Electric responses are never served from Cache Storage.
5. Test install, offline reload, queued mutation, reconnect, and update on the production origin.
6. Monitor mutation failure/quarantine counts and service-worker installation failures during initial rollout.

The first service-worker deployment must not claim old uncontrolled tabs until activation. Subsequent updates use
the prompt flow. Rollback means deploying a new forward revision; do not manually delete user service workers or
local databases.

## Completion Criteria

This work is complete only when all of the following are true:

- No GenreTV registry entry or transaction uses pessimistic write mode.
- No route waits for a server mutation acknowledgement before reporting local success.
- No `updateBlind` call remains.
- A returning browser can reload the production build offline and render cached canonical and personal data.
- Every supported authenticated workflow can enqueue offline and converge after reconnect.
- Offline periods do not exhaust mutation retry attempts.
- Pending, delayed, conflicted, quarantined, auth-needed, stale, and synchronized states are visible and actionable.
- Publication remains presentation-consistent across partial/multi-batch convergence.
- The application is installable and its complete runtime, including PGlite and implemented exports, is cached.
- Service-worker updates preserve queued intent and respect `/docs/` routing.
- Offline restart, reconnect, conflict, rejection, publishing, and update behavior pass Playwright E2E.
- `bun run validate:full` and `bun run build:site` pass.
- End-user documentation accurately describes the deployed behavior.

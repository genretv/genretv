---
title: Troubleshooting
description: Resolve common loading, account, synchronization, and export problems.
---

## The schedule is still loading

Initial use prepares a browser-local database and loads the Canonical List, so it requires a connection. Leave
the page open while the loading panel is visible. Returning visitors can open previously loaded data offline. If
initial loading never completes, check connectivity and reload once. Persistent failures may indicate that
browser storage is unavailable or the synchronization service cannot be reached.

## A change has not synchronized

A successful editor save means the change is durable locally. It may still be pending, delayed, conflicted, or
quarantined before the server accepts it. Select the **Synchronization** status in the header to inspect the
queue. Reconnection retries ordinary queued work automatically; the Synchronization page offers manual retry and
explicit discard actions for terminal problems.

Do not clear site storage to repair synchronization unless you intend to delete the local database and any
unsynchronized changes.

## An application update is waiting

GenreTV does not silently replace a running application. Use the update prompt when it appears. If local changes
are still pending, the update action remains disabled; inspect Synchronization and let the queue settle before
reloading into the new version.

## My filters came back

Schedule and management view preferences are deliberately saved in this browser. Clear the active controls in the app. Clearing site storage also removes preferences, but may remove the local database and other GenreTV browser data as well.

## Signing out did not remove local data

That is expected. GenreTV keeps each account's mapped PGlite store because it may contain account data or unsynced writes. Delete GenreTV site data through browser settings only when you intentionally want to remove that local store.

## Password reset says the recovery session is missing

Open the recovery link from the email in the same browser before setting the new password. Request a fresh recovery email if the link has expired.

## A database export failed

Database export tooling is downloaded when the action is invoked. Confirm that the browser can download files and fetch additional application assets. For a personal local-database export, remain signed in and wait for the local store to finish loading.

## A published Season cannot be imported again

GenreTV marks imports already linked or copied into your Personal List and prevents duplicate actions. Remove an existing linked import when you intend to stop following it, or manage the imported Show directly.

---
title: Troubleshooting
description: Resolve common loading, account, synchronization, and export problems.
---

## The schedule is still loading

Initial use prepares a browser-local database and loads the Canonical List. Leave the page open while the loading panel is visible. If it never completes, check connectivity and reload once. Persistent failures may indicate that browser storage is unavailable or the synchronization service cannot be reached.

## A save did not complete

GenreTV currently waits for server acknowledgement before reporting a save as successful. Check the editor's error message and your connection, retain the local draft, then retry. Do not assume the synchronized overlay changed when no success state appeared.

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

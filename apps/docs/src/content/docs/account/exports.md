---
title: Export your data
description: Download canonical schedules, personal lists, or PGlite database backups.
---

Open [Export](/#/export). Anonymous visitors see the two canonical actions. Signed-in users also see two personal actions.

## Canonical HTML

Downloads one unstyled HTML fragment containing all four canonical schedule tables. It resembles the original GenreTV table format and includes resolved Show and Season information, but no Episode details or interactive controls.

The export ignores filters, custom sorting, pagination, and expanded rows.

## Canonical database

Downloads portable SQL containing only canonical Show, Season, and Episode base tables and their data. It excludes views, synchronization registry relations, functions, triggers, and personal data.

## Personal HTML

**Requires sign-in.** Downloads the fully resolved Personal List: the canonical baseline after applying your additions, overrides, hidden items, and linked or detached imports. It is not merely the sparse overlay rows.

## Local database

**Requires sign-in.** Downloads a complete backup of the account's mapped PGlite store, including synchronization metadata and unsynced local writes. This is the comprehensive diagnostic and recovery-oriented export.

Database export tooling loads only when you request a database export, so it does not delay GenreTV's initial application or schedule loading.

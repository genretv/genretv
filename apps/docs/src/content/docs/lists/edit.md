---
title: Edit shows and seasons
description: Use GenreTV's Show-first management interface.
---

**Requires:** a signed-in account.

Management is organized by the data hierarchy, not by the four Schedule Sections:

1. Open [Manage](/#/manage) and search for a Show.
2. Select **Edit** or any non-title part of its row. When IMDb is known, the title itself opens IMDb in a new tab.
3. Edit Show metadata and inspect its Seasons.
4. Open a Season to edit its release metadata and inspect optional Episodes.
5. Open an Episode to edit Episode-specific metadata.

## Add a Show

Select **Add show**. Saving a new Show creates its initial Season as part of the local editing flow. Add every known numbered Season; metadata may remain unknown where the source does not provide it.

## Show fields

Show editing includes title and original title, lifecycle status, ordered languages and countries, Genre Tags, External Links, Organizations, and notes. Lifecycle status belongs to the Show: Seasons are releases, not independently cancelled Shows.

## Season fields

A Season can be numbered or represent an Extra Release such as a special, movie, pilot, or other one-off. Its timing can use an exact or imprecise Release Window, a confidence level, a weekly or bulk Release Pattern, finale information, Organizations, links, and notes.

## Episodes

Episodes are optional. Do not create placeholder Episode rows merely to satisfy a count. Add them when useful information is known.

## Save feedback

Saving commits the change to your browser-local database and durable synchronization queue immediately. It works
without a network connection and the editor reports that the change was saved locally. The header's
**Synchronization** status shows whether the work has reached the server.

Queued changes survive reloads. When connectivity returns, GenreTV resumes synchronization automatically. Open
the [Synchronization](/#/sync) page to inspect pending work, retry failed entries, or explicitly discard a
conflicted or quarantined change.

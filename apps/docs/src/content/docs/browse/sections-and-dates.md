---
title: Sections and dates
description: Understand dynamic schedule placement and imprecise release timing.
---

GenreTV derives the active Schedule Section from release information and the current date. A row can therefore move between sections without anyone manually moving it.

## Now Showing

Shows Seasons that are currently releasing. A weekly Season remains current through its known finale. A bulk or binge release remains current for a grace period after its release date; the Schedule labels an active bulk release **Binge**.

## Upcoming

Shows announced future Seasons and Extra Releases. Multiple greenlit Seasons may all appear, including estimated windows when exact dates are not yet known. A known renewal belongs here rather than in Awaiting Renewal or Cancellation.

## Awaiting Renewal or Cancellation

Shows the latest concluded Season of an open Show when there is no current or future Season and no confirmed decision that the Show has ended or been cancelled.

## Finished

Shows the latest relevant release for Shows known to have ended or been cancelled. The status explains the outcome when known, including cancellation. Finished defaults to reverse chronological timing; other sections default to earliest first.

## Exact and imprecise timing

A Release Window may be an exact date, a month, a Northern Hemisphere meteorological season, or a year. GenreTV preserves that precision instead of inventing an exact date.

For ordering, an imprecise value sorts at the **end** of its period. An exact date in the same period therefore appears first. For example, an exact June date sorts before an imprecise `June`, and an exact autumn date sorts before `Autumn`.

Timing may also carry confirmed, tentative, inferred, rumored, or estimated confidence. Treat imprecise and lower-confidence values as planning guidance rather than broadcast guarantees.

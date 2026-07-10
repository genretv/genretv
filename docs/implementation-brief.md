# genretv Implementation Brief

genretv replaces the current Blogspot schedule with a React PWA built around pgxsinkit, Supabase Auth, Supabase/Postgres, PGlite, and Electric SQL Cloud. The public default experience is a canonical genre-TV schedule; signed-in users get a personal overlay, publishing workflows, and later maintainer contribution workflows.

## Core Product Shape

The public front page is a Schedule View: season-oriented rows grouped and ordered from release timing. Management is catalog-oriented: search for a Show, edit Show properties, drill into Seasons, then Episodes.

The Canonical List is system-owned, not a special auth user. It is the signed-out default and the baseline for new users. Each user has exactly one Personal List, represented as an Empty Overlay over the Canonical List until they add, hide, import, or edit data.

Published user lists are public resources with stable Public List Slugs. Publishing creates Published Snapshots rather than exposing live drafts.

## Sync Architecture

All genretv domain data flows through pgxsinkit Sync Registry Entries. There is no plain REST path for app data. Supabase Auth handles identity only: signup, login, password recovery, session refresh.

Anonymous Mode uses public pgxsinkit/Electric fixed shapes. Electric SQL Cloud handles anonymous read caching through its CDN.

The Canonical List shape is front-loaded. On first page load, genretv should create a Public Spare Store in the worker path and provision it with the full genretv sync registry plus Canonical List data. Anonymous visitors read from that store immediately.

On login, Store Takeover binds that public-provisioned PGlite store id to the signed-in user. The canonical public shape remains active, user-specific shapes begin lazy persisted sync, and mutation capability becomes available through pgxsinkit's write path.

Mapped Stores must not be deleted on logout. They may contain persisted synced data or unsynced offline mutations. Logout switches the browser back to Anonymous Mode using a ready Public Spare Store or by provisioning one.

Other published user overlays and the signed-in user's Personal List overlay use lazy persisted shapes. Display data should be built with normal live Drizzle queries over synced registry tables and views. Drizzle `pgView` objects are optional later if query reuse becomes painful.

## MVP Data Model

Primary management entities:

- Show: display title, optional original title, aliases, languages, countries, genre tags, lifecycle status, organizations, external links, notes.
- Season: parent Show, Season Label, optional title, Release Window, Date Confidence, Release Pattern, Episode Count, lifecycle status, organizations, external links, notes.
- Episode: parent Season, optional title, Episode Label, optional Release Window, notes.

Release Windows support exact dates, Release Seasons, year-only values, and Unknown Values. Release Seasons use Northern Hemisphere meteorological windows for deterministic sorting while preserving fuzzy display labels.

Schedule placement is derived from Release Windows, not manually assigned. Bulk streaming releases stay current for a Current Grace Period, initially five weeks.

Languages are ordered zero-or-more ISO 639 code lists. Countries are ordered zero-or-more ISO 3166-1 code lists. Default filters match any listed value, with ordering affecting display and possible future ranking.

Organizations are first-class records related to Shows or Seasons through ordered Organization Roles such as network, streamer, studio, production company, distributor, or rights holder.

People and structured credits are explicitly deferred. Cast, crew, directors, writers, and creators can be mentioned in Notes or External Links, but are not modeled in MVP.

## Overlay And Publishing Model

Linked Import is the default import mode. It keeps receiving upstream changes for fields the user has not overridden. Detached Copy is available as an explicit action when a user wants independence.

Imported and inherited items can be hidden through Hidden Item overlay metadata. Hiding does not delete upstream data.

Overlays use typed domain rows plus Overlay Metadata rather than opaque JSON patches. Overlay Metadata records inheritance, linking, hiding, detachment, canonical ownership, and user ownership.

Canonical Proposals are season-centered. A Publisher can submit a Season from their Personal List for Canonical Maintainer review, including parent Show metadata and any known Episode metadata. Maintainers use Field-Selective Merge, accepting only the useful fields, links, tags, or child records.

## User Roles And Workflows

Open signup creates a normal User. New users receive an Empty Overlay over the Canonical List.

Publisher and Canonical Maintainer capabilities are permission-gated. Users can submit a Publish Application with an optional message. Maintainers receive internal Maintainer Notifications. Chat is explicitly later than MVP.

Publishers can publish their Personal List and submit Canonical Proposals. Canonical Maintainers can edit and publish the Canonical List.

## View Preferences

Anonymous and signed-in users can set local View Preferences for filters and ordering. These are stored in local storage for MVP and are not synced domain data.

Sub-Lists are filtered or ordered views of a single Personal List, not separate synced lists. MVP publishing publishes the whole Personal List, not a filtered Sub-List.

Initial filters/orderings:

- Schedule section: now showing, upcoming, awaiting renewal or cancellation, finished
- Genre Tags
- Release Pattern
- Organizations/platforms
- Show Language
- Show Country
- Date window
- Sort by release window, title, or recently updated

## First Vertical Slice

Slice 1 proves the public canonical schedule and pgxsinkit boot path:

- Replace copied board domain schema with genretv domain schema for Shows, Seasons, Release Windows, Genre Tags, Organizations, External Links, Notes, and Canonical List membership.
- Seed a small Canonical List manually.
- Implement Anonymous Mode with a Public Spare Store.
- Front-load canonical shape data into local PGlite.
- Render the Schedule View with live Drizzle queries.
- Add row expansion for Show/Season details, External Links, Organizations, Notes, and Episode list or unknown state.
- Keep editing UI out of Slice 1 except seed/dev tooling.

Slice 2 adds auth and personal data:

- Supabase signup, login, password recovery.
- Store Takeover from public spare to signed-in Mapped Store.
- Lazy persisted Personal List overlay shape.
- Offline-capable writes through pgxsinkit's mutation journal.
- Basic hide/edit/add Season overlay actions.

Slice 3 adds management:

- Show search.
- Show edit page.
- Season list and Season edit page.
- Episode list and Episode edit page.
- Local filters/orderings persisted as View Preferences.

Slice 4 adds publishing:

- Publish Application.
- Publisher role grant flow.
- Published Snapshot creation.
- Public List Slugs and lazy persisted public overlays.
- Linked Import and Detached Copy.

Slice 5 adds maintainer workflows:

- Maintainer Notifications.
- Canonical Proposals.
- Field-Selective Merge into Canonical List.
- Canonical publishing workflow.

## Explicit Non-Goals For MVP

- Plain REST domain APIs.
- Static public data export.
- Multiple synced lists per user.
- Publishing filtered Sub-Lists.
- Structured cast/crew/person credits.
- Full chat.
- Binary blobs or media management.
- Automatic duplicate merging.

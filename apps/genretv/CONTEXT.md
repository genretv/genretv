# genretv

genretv tracks genre television schedules as editable lists. The public site presents a canonical schedule by default, while signed-in users can maintain their own list view without losing the shared baseline.

## Language

**Show**:
A television series or one-off title tracked by genretv. Shows are the primary unit for management, own their seasons and episodes, and have a display title plus optional original title. A Show can exist without Seasons in the Management View.
_Avoid_: Series entry, program, title row

**Show Alias**:
An alternate, translated, or historical title for a Show, used for search and duplicate detection.
_Avoid_: Duplicate title, display title

**Duplicate Warning**:
A non-automatic warning that a Show may already exist, based on signals such as aliases or External Links. Duplicate Warnings do not merge records by themselves.
_Avoid_: Auto-merge, title match

**Season**:
A numbered, titled, special, pilot-only, movie-like, or otherwise release-oriented part of a Show. Seasons carry schedule information such as premiere, finale, hiatus, renewal, and cancellation details; season titles are optional.
_Avoid_: Row, season count

**Season Label**:
A structured label describing how a Season should be displayed, such as numbered, special, miniseries, pilot, movie, or unknown.
_Avoid_: Season number zero, null season number

**Release Window**:
A date, calendar season, year, or similarly imprecise period describing when a Season or Episode is expected to air or release. Imprecise Release Windows can be ordered by an approximate midpoint while preserving the original precision.
_Avoid_: Manual placement, sort date

**Release Pattern**:
How a Season releases, such as weekly, bulk, or unknown. Release Pattern affects how long a Season appears current in the Schedule View.
_Avoid_: Platform type, inferred streamer behavior

**Release Season**:
A Northern Hemisphere meteorological season used as a fuzzy Release Window label and a deterministic sorting/filtering window.
_Avoid_: Astronomical season, exact date

**Date Confidence**:
The confidence level attached to a Release Window, distinguishing confirmed dates from tentative, inferred, rumored, or estimated timing.
_Avoid_: Certainty flag, status

**Episode**:
An individual installment within a Season, with an optional title. A Season can validly have no Episode records when episode details or episode count are unknown.
_Avoid_: Chapter, part

**Episode Label**:
An optional display label or numeric position for an Episode, used when ordinary episode numbering is unknown, special, or not enough.
_Avoid_: Fake episode number, placeholder episode

**Episode Count**:
An optional Season-level count of expected or known episodes. It can be known even when individual Episode records are absent, and it does not need to equal the number of Episode records during incomplete data entry.
_Avoid_: Episode row count, required count

**External Link**:
A typed link attached to a Show, Season, or Episode, such as IMDb, Wikipedia, official, studio, network, streaming, or other references.
_Avoid_: IMDb URL, Wikipedia URL, studio URL

**Organization**:
A structured company or institution related to a Show or Season, such as a network, streamer, studio, production company, distributor, or rights holder.
_Avoid_: Studio text, network string, streamer link

**Organization Role**:
The typed, ordered zero-or-more relationship an Organization has to a Show or Season, such as network, streamer, studio, production company, distributor, or rights holder. Ordering expresses relative importance within the same role.
_Avoid_: Link type, company category

**Source Note**:
A lightweight provenance note for metadata, imports, or release timing, recording where information came from and any useful context. Source Notes can be private or public.
_Avoid_: Citation system, audit log

**Note**:
A free-text annotation attached to a Show, Season, Episode, proposal, or list item. Notes can be private or public, and can mention cast, crew, context, or maintainer observations without creating structured metadata for those concepts.
_Avoid_: Structured credit, field

**Unknown Value**:
A deliberately missing value for schedule or episode metadata, stored as null rather than a placeholder. Unknown Values are valid and do not make a Show, Season, or Episode incomplete.
_Avoid_: TBD string, fake date, zero episodes

**Genre Tag**:
A flexible descriptive tag applied to a Show, such as superhero, space opera, anime, fantasy, or post-apocalyptic.
_Avoid_: Section, category

**Show Language**:
An ordered zero-or-more ISO 639 language-code list used for filtering Shows and Seasons in the Schedule View. When present, earlier languages are more central to the Show or Season; Seasons can override or refine the Show's language list.
_Avoid_: Locale, subtitle language

**Show Country**:
An ordered zero-or-more ISO 3166-1 country-code list used for filtering Shows and Seasons in the Schedule View. When present, earlier countries are more central to the Show or Season; Seasons can override or refine the Show's country list.
_Avoid_: Region, market

**Schedule Section**:
A curated display grouping in the Schedule View, such as current, upcoming, or finished seasons.
_Avoid_: Genre, tag

**Lifecycle Status**:
A structured status describing a Show or Season's broader production state, such as ongoing, renewed, final season, ended, cancelled, completed, or unknown. Show-level status describes the overall series; Season-level status describes that specific release. Lifecycle Status is distinct from Schedule Section.
_Avoid_: Schedule section, status note

**Current Grace Period**:
The period after a bulk Season release during which it still appears current in the Schedule View. Streamer season dumps use this to approximate the existing maintainer practice of leaving recently released seasons in the current section for a while.
_Avoid_: Manual current placement, stale current row

**Canonical List**:
The system-owned default genre TV schedule shown to signed-out visitors and used as the starting point for new users. Trusted maintainers can edit or publish it, but it is not owned by a normal auth account.
_Avoid_: God account, master user, default user

**Personal List**:
A user-owned view of the schedule that begins from the Canonical List and stores that user's additions, edits, and removals as list-specific changes.
_Avoid_: Account list, private copy

**View Preference**:
A local browser preference for filtering, ordering, or otherwise viewing a list. View Preferences can apply to signed-in or anonymous visitors and are stored locally in the MVP.
_Avoid_: Synced setting, list data

**Sub-List**:
A filtered or ordered view of a single Personal List rather than a separate owned list.
_Avoid_: Second list, collection

**List Overlay**:
The set of user-owned Show, Season, and Episode changes that modifies how a Personal List appears relative to the Canonical List.
_Avoid_: Fork, diff, patch

**Overlay Metadata**:
Typed list membership and linkage data that records whether domain rows are inherited, linked, hidden, detached, canonical-owned, or user-owned.
_Avoid_: JSON patch, generic diff

**Empty Overlay**:
A Personal List with no stored user changes yet, so it appears identical to the Canonical List while storing only the user's list identity.
_Avoid_: Copied default list, seeded rows

**Hidden Item**:
A List Overlay change that removes an inherited Show, Season, or Episode from a Personal List's views without deleting the source item.
_Avoid_: Delete, remove upstream

**Season Copy**:
A Season-level import from a public list into a Personal List. It brings along the parent Show metadata and any known Episode records, then becomes editable through the receiving user's List Overlay.
_Avoid_: Row copy, clone

**Linked Import**:
An import from a public list that keeps receiving upstream changes for fields the receiving user has not overridden.
_Avoid_: Subscription, live copy

**Detached Copy**:
An import from a public list that becomes independent after copying. It can remember where it came from, but upstream changes no longer flow into it.
_Avoid_: Full clone, duplicate

**Schedule View**:
The public-facing way of reading a list, organized around current, upcoming, and finished seasons. It resembles the existing Blogspot page and is optimized for quickly seeing what is airing or coming soon; it renders Seasons with parent Show information rather than bare Show records.
_Avoid_: Normal view, front page table

**Management View**:
The editing interface organized around searching for a Show, editing Show properties, then drilling into Seasons and Episodes.
_Avoid_: Admin view, edit table

**User**:
A signed-in person who can maintain their own Personal List.
_Avoid_: Member, account

**Publisher**:
A User who is allowed to publish one or more of their own lists so other users can view and import from them.
_Avoid_: Public user, sharer

**Canonical Maintainer**:
A trusted User who can edit and publish the Canonical List.
_Avoid_: God user, admin

**Publish Application**:
A User's request to become a Publisher, including an optional message for maintainers.
_Avoid_: Signup approval, publisher signup

**Maintainer Notification**:
An internal notification shown to maintainers when a User needs review or action, such as a Publish Application or Canonical Proposal.
_Avoid_: Chat, email

**Canonical Proposal**:
A Publisher's request for a Canonical Maintainer to review and merge a Season-centered contribution from the Publisher's Personal List into the Canonical List, including parent Show metadata and any known Episode metadata.
_Avoid_: Pull request, chat message, submission

**Field-Selective Merge**:
A maintainer review action that applies chosen proposed fields, links, tags, or child records into the Canonical List instead of accepting or rejecting an entire proposal at once.
_Avoid_: All-or-nothing merge, manual re-entry

**Sync Registry Entry**:
A pgxsinkit-declared domain data path used for synced reads and writes. genretv domain data should flow through Sync Registry Entries rather than plain REST endpoints.
_Avoid_: REST endpoint, ad hoc API

**Anonymous Mode**:
The signed-out read mode for public visitors, backed by public pgxsinkit/Electric fixed shapes rather than static exports or plain REST.
_Avoid_: Static public site, unauthenticated REST

**Public Fixed Shape**:
A published-list-specific Electric shape, declared through pgxsinkit, that serves anonymous public reads and can be cached by Electric SQL Cloud's CDN.
_Avoid_: Static export, public REST query

**Front-Loaded Shape**:
A sync shape started eagerly because nearly every visitor needs it, especially the Canonical List.
_Avoid_: Static preload, bundled data

**Public Spare Store**:
A pre-created PGlite store, normally hosted in a SharedWorker, provisioned for Anonymous Mode with the genretv sync registry and Canonical List data before a user signs in.
_Avoid_: Schemaless spare, empty login store

**Store Takeover**:
The moment a signed-in user claims a Public Spare Store by binding its store id to their identity, then starts syncing user-specific shapes and enables mutation capability.
_Avoid_: Copy public data, migrate store

**Mapped Store**:
A local PGlite store id associated with a specific signed-in user. Mapped Stores are retained across logout and must not be deleted automatically.
_Avoid_: Session cache, disposable login database

**Lazy Persisted Shape**:
A sync shape started only when the user navigates to or otherwise needs it, then persisted locally through PGlite for reuse.
_Avoid_: REST fetch, server materialized copy

**Local Materialization**:
The normal client-side construction of display data from synced pgxsinkit registry tables and views, usually through live Drizzle queries against local PGlite.
_Avoid_: Server materialized overlay, special read-model layer

**Public List Slug**:
A stable, shareable URL identifier for a published user's list. The Canonical List remains the root public schedule, while user-published lists use their own slugs.
_Avoid_: Username-as-id, list UUID URL

**Published Snapshot**:
A public, importable version of a list created when its owner publishes. It represents the latest intentionally released state, not the owner's in-progress working edits.
_Avoid_: Live list, public draft

**Published Show**:
A Show row captured inside a Published Snapshot. It may come from a Canonical List item, a Personal List overlay item, or a user-owned addition, and is read by other users as public source material for imports.
_Avoid_: Live show, public draft show

**Published Season**:
A Season row captured inside a Published Snapshot, including its parent Published Show relationship and schedule metadata at publish time.
_Avoid_: Live season, public draft season

**Published Episode**:
An Episode row captured inside a Published Snapshot, including its parent Published Season relationship and episode metadata at publish time.
_Avoid_: Live episode, public draft episode

**List Import Record**:
A Personal List record that remembers a Linked Import or Detached Copy from a Published Snapshot, including the imported source item and the user's target overlay item.
_Avoid_: Import log, copy flag

**User Profile**:
A user-owned public identity record used for display names and future public list attribution. It is distinct from Supabase Auth identity and does not replace auth roles.
_Avoid_: Auth user, account row

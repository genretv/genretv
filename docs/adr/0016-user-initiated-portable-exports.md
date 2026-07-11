# User-Initiated Portable Exports

genretv will expose one global Export command leading to a dedicated `/export` page. Anonymous visitors see canonical HTML and canonical database exports plus an invitation to sign in. Signed-in users see those two canonical exports and additionally a Personal HTML Export and a complete local database export. Each action has explanatory copy describing its scope.

An HTML Schedule Export is a bespoke, unstyled HTML fragment with one parent `div` containing four original-GenreTV-style schedule tables in display order: On Now, Upcoming, Awaiting Renewal or Cancellation, and Past Shows. It uses default section ordering and all rows, independent of saved filters, sorting, pagination, and expanded-row state. It contains Show and Season schedule information but no Episode details, interactive controls, classes, styles, or presentation attributes. Each table keeps the original six-column rhythm, with the first header cell serving as both section label and Show-column heading. Show titles link to IMDb when known, platform names retain official links, and the remaining columns preserve the original timing/status, genre and language, season-count, and finale information as closely as the resolved domain model allows. Ordered ISO 639 languages are appended to the Genre cell, except that the common English-only case has no marker. Awaiting uses the Past-style layout with its status and latest known release.

The canonical HTML action exports the Canonical List. The personal HTML action exports the fully resolved Personal List: canonical baseline plus the user's edits, exclusions, additions, and linked or detached imports. It never exports only the sparse Personal Overlay rows.

Database exports use the official `@electric-sql/pglite-tools` implementation through first-class pgxsinkit client capabilities, because pgxsinkit's SharedWorker owns each active PGlite instance. The canonical database action uses `exportData` against an on-demand, read-only canonical registry containing only canonical Show, Season, and Episode tables; its portable SQL excludes views, pgxsinkit relations, functions, triggers, and personal data. The signed-in local database action uses `exportStore` against the account's existing worker and includes the complete mapped store, including sync state, overlays, and unsynced Mutation journal rows.

The pg_dump implementation is an installed, pinned dependency loaded into the running application by dynamic
import only after a database export action is invoked. The installed PWA service worker may cache its revisioned
export worker and WASM assets in the background after the local database and application have become usable, so
database exports remain available offline. Service-worker installation never gates the first render or local
database readiness; application code does not preload or execute the export implementation during startup.

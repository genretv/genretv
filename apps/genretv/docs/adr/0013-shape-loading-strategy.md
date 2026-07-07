# Shape Loading Strategy

The Canonical List shape will be front-loaded because every anonymous and signed-in user needs it. genretv should extend the pgxsinkit ADR-0032 spare-store pattern: as soon as the first page loads, create a Public Spare Store in the worker path and provision it for Anonymous Mode with the full genretv sync registry plus Canonical List data. Anonymous visitors read from that public-provisioned store immediately.

When a user signs in, they perform Store Takeover: the existing public-provisioned PGlite store id becomes associated with that user, the canonical public shape remains active as the baseline, user-specific shapes such as their Personal List overlay begin lazy persisted sync, and mutation capability becomes available through the pgxsinkit write path. Store Takeover layers authenticated/user-specific shapes on top of the existing public store rather than tearing down or recreating the canonical data path. After takeover, the app should create another Public Spare Store for a future anonymous visitor, another user, or a later login.

Logout must keep the user's Mapped Store and must not delete the PGlite database. The store may contain persisted synced data or unsynced offline mutation state; deleting it is a user/browser-storage decision, not an application logout side effect.

After logout, the app returns to Anonymous Mode by switching to an available Public Spare Store, or by creating and provisioning one if no ready spare exists. User-specific shapes from the logged-out Mapped Store must no longer be exposed in the anonymous session.

Other published user overlays should use pgxsinkit's lazy persisted mode so they sync only when a visitor opens that public list, then remain available locally through PGlite. A signed-in user's Personal List overlay should also be lazy persisted as soon as they log in.

This keeps the public default fast while preserving the Electric + PGlite pattern: sync the data needed by shapes, persist it locally, and build display queries locally rather than server-materializing every overlay into full copied rows. If repeated query complexity justifies it later, genretv can add Drizzle-declared pgView objects, but the MVP should prefer ordinary live Drizzle queries over the synced registry tables and views.

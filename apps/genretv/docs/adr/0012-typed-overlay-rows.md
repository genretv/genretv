# Typed Overlay Rows

Personal List overlays will use normal typed domain rows plus Overlay Metadata rather than a generic JSON patch table. This keeps pgxsinkit registry entries, RLS, local queries, filtering, public fixed shapes, and field-selective merge behavior queryable without forcing every read path to reconstruct list state from opaque patches.

Typed overlay rows do not mean other published lists or personal overlays are server-materialized into full resolved rows before syncing. pgxsinkit/Electric should persist the source data and overlay data needed by each shape, and genretv should construct display data locally with normal live Drizzle queries over synced registry tables and views. Dedicated local pgView/read-model objects are optional implementation tools, not a default architectural requirement.

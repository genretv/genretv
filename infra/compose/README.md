# GenreTV Local Stack

This is the local Supabase + Electric stack for genretv. It follows the pgxsinkit demo model:
GoTrue for auth, Envoy as the Supabase-compatible gateway, edge-runtime for `genretv-sync` and
`genretv-write`, Electric for shapes, and no PostgREST data API.

Run:

```sh
bun run infra:local:up
bun --env-file=infra/compose/genretv.env run dev:genretv
```

Local URLs:

- App: `http://localhost:5173`
- Supabase-compatible gateway: `https://localhost:54343`
- Plain gateway, useful for curl: `http://localhost:54331`
- Studio: `http://localhost:54333`
- Electric direct port: `http://localhost:54330`
- Postgres: `localhost:54322`

Seeded login users all use password `genretv-local-password`:

- `maintainer@genretv.local` with `canonical_maintainer` and `publisher` roles
- `publisher@genretv.local` with `publisher` role
- `user@genretv.local` with no elevated roles

`bun run infra:local:up` builds the edge bundles, starts Postgres, applies the committed Drizzle
migrations, seeds the canonical list through typed Drizzle table objects, then starts the remaining
Supabase/Electric services.

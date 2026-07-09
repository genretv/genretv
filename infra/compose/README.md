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
Supabase/Electric services. The manual stack uses `supabase/functions-dist` for its edge-function
bundle.

Integration and E2E checks:

```sh
bun run test:integration
bun run test:integration:live
bun run test:e2e
```

`test:integration` runs static repository contracts. `test:integration:live` checks the manual local
stack and expects `bun run infra:local:up` first. `test:e2e` is deliberately separate: Playwright starts
and tears down a disposable `genretv-e2e` compose project with distinct container names and `554xx`
ports, and it builds edge functions into `tmp/agents/e2e-functions-dist`, so browser tests never write
into your manual local stack.

E2E URLs:

- App: `http://127.0.0.1:5174`
- Plain gateway: `http://localhost:55431`
- Studio: `http://localhost:55433`
- Electric direct port: `http://localhost:55430`
- Postgres: `localhost:55422`

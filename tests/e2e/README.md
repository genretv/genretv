# GenreTV E2E Tests

The browser tests exercise a real Supabase, Electric, pgxsinkit, PGlite, and Vite stack, but it is
not the manual local development stack. Playwright owns a disposable E2E compose project using
`infra/compose/genretv-e2e.env`, builds edge functions into `tmp/agents/e2e-functions-dist`, starts it
in global setup, and removes it with volumes in global teardown.

```sh
bun run test:e2e
```

The tests use the disposable plain gateway at `http://localhost:55431` and Vite at
`http://127.0.0.1:5174`, so they do not share ports, containers, or database state with
`bun run infra:local:up`. They also mount a separate edge-function bundle from
`tmp/agents/e2e-functions-dist` instead of the manual stack's `supabase/functions-dist`. Seeded users
come from `infra/compose/genretv/seed-users.sh`; the maintainer login is `maintainer@genretv.local`
with password `genretv-local-password`.

For debugging, `GENRETV_E2E_KEEP_STACK=1 bun run test:e2e` leaves the disposable E2E stack running.

The suite defaults to one worker. Each browser worker boots and synchronizes its own PGlite database, so local
parallelism contends heavily for the PGlite WASM thread and the shared Electric/Postgres stack; four workers were
measured to make individual tests roughly three to four times slower while substantially increasing host load.
`GENRETV_E2E_WORKERS=<n> bun run test:e2e` remains available for CI runners where measured sharding is beneficial.
The production offline suite is always single-worker because its cases deliberately change browser connectivity,
service-worker state, and persistent local storage.

Clean it manually with:

```sh
bun run infra:e2e:down
```

For live HTTP integration checks without opening a browser:

```sh
bun run infra:local:up
bun run test:integration:live
```

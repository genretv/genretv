# GenreTV

GenreTV is an offline-first web application for finding, maintaining, and sharing science-fiction,
fantasy, supernatural, superhero, and related television schedules. It is a structured successor to
the long-running [GenreTV Blogspot schedule](https://genretv.blogspot.com/): the familiar date-oriented
public tables remain the starting point, while the underlying catalog now supports real Shows,
Seasons, optional Episodes, user-owned overlays, published lists, and maintainer review workflows.

The project is also a public, production-oriented demonstration of
[pgxsinkit](https://github.com/pgxsinkit/pgxsinkit). Domain reads and writes use pgxsinkit Sync
Registry Entries end to end; GenreTV does not add a parallel plain-REST data path.

> **Status:** active pre-1.0 development. The core schedule, authentication, personal overlays,
> publishing/imports, maintainer proposals, local infrastructure, cloud deployment tooling, portable
> exports, and end-user documentation are implemented. Data enrichment and broader catalog coverage
> remain ongoing work.

## What GenreTV Models

The public experience and the editing experience deliberately have different shapes:

- **Schedule View** presents schedule-relevant Seasons in four date-sensitive sections: **Now
  Showing**, **Upcoming**, **Awaiting Renewal or Cancellation**, and **Finished**.
- **Management View** starts from a Show search, then drills from Show to Seasons and from Season to
  optional Episodes.

The principal list concepts are:

- **Canonical List**: the system-owned default schedule used by signed-out visitors and as the
  baseline for every user.
- **Personal List**: one user-owned overlay over the Canonical List. A new user starts with an empty
  overlay, so their resolved list initially looks canonical without copying canonical rows.
- **Published Snapshot**: an intentionally published, stable version of a user's resolved list.
- **Linked Import**: an imported published item that can continue receiving source changes until the
  recipient overrides it.
- **Detached Copy**: an independent copy that no longer follows its source.
- **Canonical Proposal**: a publisher's Show-, Season-, or Episode-centered contribution for a
  canonical maintainer to review and merge field by field.

Every persisted Show owns at least one Season. Known numbered Seasons receive real rows, including
historical or greenlit Seasons whose detailed metadata is still unknown. Episodes are optional:
missing Episode rows or an unknown Episode count are valid data, not validation failures. Cast, crew,
and other IMDb-scale credits are intentionally deferred; free-text notes can preserve useful context
without prematurely modeling those domains.

The canonical vocabulary is maintained in [apps/genretv/CONTEXT.md](apps/genretv/CONTEXT.md). Read it
before changing schema or product behavior: terms such as Schedule Section, Source Schedule Section,
Lifecycle Status, Final Season, Linked Import, and Published Snapshot are intentionally distinct.

## Architecture

GenreTV uses a local-first PostgreSQL model in the browser:

```text
PostgreSQL
    │
    ▼
Electric SQL shapes
    │
    ▼
genretv-sync Edge Function (registry-controlled proxy)
    │
    ▼
pgxsinkit SharedWorker ──► PGlite ──► live Drizzle queries ──► React

React mutation
    │
    ▼
pgxsinkit mutation journal ──► genretv-write Edge Function ──► PostgreSQL
                                      ▲                            │
                                      └──── convergence via Electric
```

- **Supabase Auth** owns signup, login, password recovery, sessions, and trusted app metadata roles.
- **PostgreSQL + Drizzle** own domain structure, RLS policies, and durable data.
- **Electric SQL** streams registry-approved shapes and provides CDN-backed public shape delivery in
  managed deployments.
- **pgxsinkit** defines the read/write contract, worker lifecycle, local mutation journal, shape
  loading, and convergence behavior.
- **PGlite** persists the local relational store. Display data is materialized locally with ordinary
  live Drizzle queries rather than server-rendered overlay copies.
- **React + TanStack Router + Mantine** provide the application UI.

The Canonical List is eagerly synchronized because every visitor needs it. Personal overlays and
other published lists use lazy persisted shapes. Signing in binds the active public-provisioned store
to that user and enables user-specific shapes and writes. Logging out does **not** delete a mapped
PGlite store because it may contain persisted data or unsynced mutations.

See the [implementation brief](docs/implementation-brief.md) and the architecture decisions in
[docs/adr](docs/adr/) for the complete rationale.

## Technology

- TypeScript 7+
- React 19, TanStack Router, Mantine 9, and Vite 8
- Bun workspaces and Bun test
- pgxsinkit, PGlite, and Electric SQL
- Drizzle ORM/Kit 1.0 release candidates
- Supabase Auth, PostgreSQL 17+, and Supabase Edge Functions
- Astro 7 and Starlight for end-user documentation
- Playwright for browser integration and E2E coverage
- Podman Compose for local and isolated test infrastructure

Exact versions are pinned in the workspace manifests and `bun.lock`.

## Repository Layout

```text
apps/
├── genretv/          React application, schedule projection, management UI, and canonical seeds
├── genretv-api/      Shared server core plus Bun and Deno/Supabase runtime adapters
└── docs/             Astro/Starlight end-user documentation

packages/
├── domain/           Drizzle schema, pgxsinkit registry, policies, and shared domain contracts
└── offline-data/     Worker clients, live hooks, store mapping, and PGlite/pgxsinkit integration

infra/
├── compose/          Local Supabase-compatible, Electric, PostgreSQL, and E2E stacks
├── drizzle/          Generated and sanctioned custom Drizzle migrations
└── seeds/            Infrastructure seed support

docs/
├── adr/              Product and architecture decisions
├── runbooks/         Cloud, migration, and site-publishing operations
└── implementation-brief.md

scripts/              Repository orchestration, infrastructure, migration, and cloud commands
supabase/             Edge Function source configuration and generated deploy bundles
tests/                Cross-package integration and Playwright E2E tests
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh/) 1.3.14 (the version declared by `packageManager`)
- Podman with `podman compose`
- Git
- Enough browser storage for PGlite/WASM assets and local databases

The repository uses `mise` for pinned external tools where applicable. Supabase and Electric cloud
accounts are not required for local development.

### Install

```sh
git clone git@github.com:genretv/genretv.git
cd genretv
bun install
```

`bun install` also configures the repository's pre-commit hook through the `prepare` script.

### Start the local backend

```sh
bun run infra:local:up
```

This builds the Edge Function bundles, starts PostgreSQL, applies committed Drizzle migrations, seeds
the canonical registry through typed Drizzle table objects, creates local auth users, and starts the
Supabase-compatible gateway, Electric, edge-runtime, and supporting services.

### Start the application

In another terminal:

```sh
bun --env-file=infra/compose/genretv.env run dev:genretv
```

Open `http://localhost:5660`.

Local users all use password `genretv-local-password`:

| User                       | Roles                               |
| -------------------------- | ----------------------------------- |
| `maintainer@genretv.local` | `canonical_maintainer`, `publisher` |
| `publisher@genretv.local`  | `publisher`                         |
| `user@genretv.local`       | ordinary signed-in user             |

Useful local services:

| Service                           | URL                       |
| --------------------------------- | ------------------------- |
| Application                       | `http://localhost:5660`   |
| Supabase-compatible HTTPS gateway | `https://localhost:54343` |
| Plain gateway for diagnostics     | `http://localhost:54331`  |
| Supabase Studio                   | `http://localhost:54333`  |
| Electric                          | `http://localhost:54330`  |
| PostgreSQL                        | `localhost:54322`         |

Inspect or stop the stack with:

```sh
bun run infra:local:logs
bun run infra:local:down
```

The full local topology and isolated E2E port map are documented in
[infra/compose/README.md](infra/compose/README.md).

## Common Commands

| Command                    | Purpose                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `bun run dev:genretv`      | Start the React application without automatically starting infrastructure    |
| `bun run dev:api`          | Start the Bun API runtime for focused backend work                           |
| `bun run dev:docs`         | Start the end-user documentation site                                        |
| `bun run infra:local:up`   | Build and start the persistent local stack                                   |
| `bun run infra:local:down` | Stop the persistent local stack                                              |
| `bun run build`            | Build the app, API, and docs independently                                   |
| `bun run build:site`       | Build the GitHub Pages artifact with app at `/` and docs at `/docs/`         |
| `bun run typecheck`        | Type-check every TypeScript project                                          |
| `bun run format`           | Check formatting without modifying files                                     |
| `bun run format:write`     | Apply repository formatting                                                  |
| `bun run lint`             | Run the repository linter                                                    |
| `bun run test`             | Run script, frontend, and API unit tests                                     |
| `bun run test:integration` | Run static cross-package integration contracts                               |
| `bun run test:e2e`         | Run isolated container-backed Playwright tests                               |
| `bun run validate`         | Run the normal type, lint, test, seed-quality, build, and sync-artifact gate |
| `bun run validate:full`    | Add integration and E2E coverage to the normal gate                          |

Prefer these scripts over direct tool invocation; they encode the repository's complete project and
configuration set.

## Data, Seeds, and Migrations

The database contract is authored in Drizzle and pgxsinkit objects under `packages/domain/src/`.
Domain data must travel through entries in `genretvSyncRegistry`; plain REST endpoints are not an
alternative app-data path.

The canonical data pipeline has two committed JSON artifacts:

1. `apps/genretv/seeds/blogspot-canonical.seed.json` preserves the normalized legacy scrape.
2. `apps/genretv/seeds/canonical-registry.seed.json` is the deterministic registry/database seed.

Useful seed commands:

```sh
bun run seed:canonical
bun run seed:canonical:quality
bun run db:seed:canonical:local
```

See [apps/genretv/seeds/README.md](apps/genretv/seeds/README.md) before changing scrape or seed
semantics.

Never hand-create migration filenames or place independent SQL scripts beside the migration system.
Drizzle-generated schema changes and the few sanctioned custom SQL migrations form one ordered chain.
During the pre-release migration-rewrite period, follow
[docs/runbooks/regenerating-drizzle-migrations.md](docs/runbooks/regenerating-drizzle-migrations.md).

## Testing and Quality Gates

The normal pre-commit gate is:

```sh
bun run validate
```

Before a release or broad infrastructure change, run:

```sh
bun run validate:full
```

The persistent local stack and E2E stack never share containers, volumes, ports, or generated Edge
Function output. Playwright owns a disposable `genretv-e2e` project and tears it down after the run.
Tests should assert behavior rather than only mocks or snapshots.

Canonical seed quality is part of `validate`. Unknown values and intentionally absent Episodes are
valid; duplicate structured Season identities, incoherent parentage, and other blocking quality errors
are not.

## Managed Cloud Development

GenreTV can run locally while using a completely separate managed Supabase project and Electric Cloud
source:

```sh
bun run cloud:dev
```

Cloud operations use values from the gitignored `genretv.cloud.env`. Supabase CLI mutations are pinned
to both an explicit project ref and a project-account-specific access token, so an unrelated pgxsinkit
demo login cannot redirect them.

Provisioning, migration, secret, function, seed, CORS, and local-to-cloud instructions are in
[docs/runbooks/genretv-on-cloud.md](docs/runbooks/genretv-on-cloud.md).

## Documentation and Deployment

End-user documentation lives in `apps/docs` and is intentionally written for visitors, signed-in
users, publishers, and maintainers rather than contributors. The production target is:

- application: `https://genretv.github.io/`
- help: `https://genretv.github.io/docs/`

The source repository builds one atomic artifact and publishes it to the generated
`genretv/genretv.github.io` repository. Follow
[docs/runbooks/publishing-the-site.md](docs/runbooks/publishing-the-site.md) for the complete GitHub
organization/repository setup and first deployment.

## Design and Contributor Context

Start with these documents:

1. [apps/genretv/CONTEXT.md](apps/genretv/CONTEXT.md) - canonical domain vocabulary.
2. [docs/implementation-brief.md](docs/implementation-brief.md) - concise product and architecture
   model.
3. [docs/adr](docs/adr/) - accepted decisions, including canonical ownership, overlays, publishing,
   sync, shape loading, full Season history, exports, and Pages topology.
4. [AGENTS.md](AGENTS.md) - repository engineering rules, tooling standards, and database-expression
   hierarchy.
5. [infra/compose/README.md](infra/compose/README.md) - local and E2E infrastructure behavior.

Important contributor constraints include:

- use TypeScript 7+ and prefer `bun run typecheck` over ad hoc compiler commands;
- use Drizzle objects before typed SQL templates, and raw SQL strings only where Drizzle genuinely
  cannot express the operation;
- keep domain schema/contracts in `packages/domain` and PGlite/pgxsinkit lifecycle code in
  `packages/offline-data`;
- preserve all domain reads and writes through the pgxsinkit registry;
- do not delete mapped browser stores on logout;
- keep unrelated refactors out of focused product changes; and
- add focused tests for behavior, schema, registry, policy, or workflow changes.

The `Site` workflow deploys only from `main`; feature development may occur on other branches and must
reach `main` before it can publish.

## License

GenreTV is available under the [MIT License](LICENSE).

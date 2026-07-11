# GenreTV on Supabase and Electric Cloud

## When to Use This

Use this path to run GenreTV against managed Supabase and Electric Cloud instead of the local Podman Compose stack. The same React application, pgxsinkit registry, Drizzle migrations, and bundled Deno Edge Functions are used in both environments.

This runbook owns the repeatable deployment work. Creating the cloud projects and linking the Supabase CLI are one-time account-level actions that remain manual.

## Prerequisites

- A Supabase Cloud project using Postgres 17 or newer.
- An Electric Cloud source connected to the Supabase project's direct Postgres endpoint.
- The Supabase CLI installed and authenticated with `supabase login`.
- Workspace dependencies installed with `bun install`.

No secret or service-role key is exposed to the browser. GenreTV's frontend receives only the Supabase project URL, publishable key, and optional function region.

## One-Time Setup

### 1. Collect Supabase values

From the Supabase dashboard, collect:

- the project URL;
- its `sb_publishable_...` key;
- the direct database connection string on port 5432; and
- the database region, normally visible in the transaction-pooler hostname.

The direct connection is used for migrations, explicit canonical seeding, and the Electric source. Edge Functions use the `SUPABASE_DB_URL` supplied by Supabase Cloud; do not try to install secrets using the reserved `SUPABASE_` prefix.

### 2. Create the Electric source

Create an Electric Cloud source using the direct database connection. Compose its source id and secret into the provided shape URL, for example:

```text
https://api.electric-sql.cloud/v1/shape?source_id=SOURCE_ID&secret=SOURCE_SECRET
```

The URL remains server-side. `genretv-sync` receives it through the `ELECTRIC_SHAPE_URL` function secret and proxies registry-controlled shapes to the browser.

### 3. Link the Supabase CLI

From the repository root:

```sh
supabase link --project-ref YOUR_PROJECT_REF
```

The `cloud:*` commands deploy to this linked project. Set `SUPABASE_BIN` when the CLI executable is not available as plain `supabase` in non-interactive shells.

### 4. Create the cloud env file

```sh
cp genretv.cloud.env.example genretv.cloud.env
```

Fill in every required value. `genretv.cloud.env` is gitignored and must never be committed.

## Deploy

Run:

```sh
bun run cloud:deploy
```

This performs three repeatable steps:

1. **migrate** applies committed Drizzle migrations over the direct database connection;
2. **secrets** installs `ELECTRIC_SHAPE_URL` and the optional `GENRETV_ALLOWED_ORIGINS`; and
3. **functions** builds the sanctioned self-contained Deno bundles and deploys `genretv-write` and `genretv-sync`.

Each step can also be run independently:

```sh
bun run cloud:migrate
bun run cloud:secrets
bun run cloud:functions
```

The deployment does not purge data, rewrite migration history, or replay the canonical seed. GenreTV's cloud database contains durable user and maintainer data, unlike pgxsinkit's intentionally disposable board demo.

## Bootstrap Canonical Data

For a new empty project, run this once after migration:

```sh
bun run cloud:seed
```

The command uses the typed Drizzle table objects and the committed canonical registry seed. It upserts canonical Shows, Seasons, and Episodes. Because an upsert can replace canonical metadata that maintainers subsequently edited, seeding is explicit and is never part of `cloud:deploy`.

Create the first maintainer through the normal GenreTV signup flow or the Supabase dashboard, then assign its trusted `canonical_maintainer` and `publisher` roles in server-controlled app metadata. The cloud seed deliberately does not create the local development identities or passwords.

## Run Local Vite Against Cloud

```sh
bun run cloud:dev
```

Open `http://localhost:5660`. The command derives:

- `VITE_GENRETV_SUPABASE_URL` from `GENRETV_SUPABASE_URL`;
- `VITE_GENRETV_PUBLISHABLE_KEY` from `GENRETV_PUBLISHABLE_KEY`; and
- `VITE_GENRETV_FUNCTIONS_REGION` from `GENRETV_FUNCTIONS_REGION` when present.

Only these `VITE_` values reach the browser. Reads go from the browser to the cloud `genretv-sync` function and onward to Electric Cloud. Auth and writes use the Supabase project and `genretv-write`; no local API or Compose service is required.

The function region is applied only to DB-bound writes. The read proxy remains unpinned so Electric Cloud's CDN can serve it near the caller.

## CORS

`GENRETV_ALLOWED_ORIGINS` is a comma-separated list of exact origins. Include:

- `http://localhost:5660` and `http://127.0.0.1:5660` for `cloud:dev`; and
- `https://genretv.github.io` for the deployed site.

Run `bun run cloud:secrets` after changing the allow-list. A URL path such as `/docs` does not belong in a CORS origin.

## Command Summary

| Command                   | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `bun run cloud:dev`       | Run local Vite against the cloud backend       |
| `bun run cloud:migrate`   | Apply committed migrations to cloud Postgres   |
| `bun run cloud:secrets`   | Install Electric and CORS function secrets     |
| `bun run cloud:functions` | Build and deploy both Edge Functions           |
| `bun run cloud:seed`      | Explicitly bootstrap or refresh canonical rows |
| `bun run cloud:deploy`    | Migrate, set secrets, and deploy functions     |

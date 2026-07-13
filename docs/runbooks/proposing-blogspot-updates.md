# Proposing Updates From the Canonical Blogspot Page

This workflow lets GenreTV continue following `https://genretv.blogspot.com/` when its maintainer does not
edit GenreTV directly. It creates ordinary Canonical Proposals for maintainer review. It never writes a
Canonical Show or Season directly.

## Identity and permissions

The command signs in through Supabase Auth as a dedicated, ordinary user. Give that user the `publisher`
entry in `app_metadata.roles`. Do not provide a service-role or secret key: all domain reads and writes go
through the normal pgxsinkit Electric and mutation endpoints.

The disposable local and E2E stacks seed `import-bot@genretv.local` with the standard local password. For
cloud use, create the account explicitly through the trusted Auth Admin command:

```sh
bun run cloud:user:add canonical-import@example.com publisher
```

This one-time command reads `GENRETV_SECRET_KEY` from the gitignored `genretv.cloud.env`. The importer itself
never receives that key. Cloud bootstrap does not create this user.

Set:

```sh
GENRETV_BOT_SUPABASE_URL=https://PROJECT_REF.supabase.co
GENRETV_BOT_PUBLISHABLE_KEY=sb_publishable_...
GENRETV_BOT_EMAIL=canonical-import@example.com
GENRETV_BOT_PASSWORD=...
GENRETV_BOT_FUNCTIONS_REGION=REGION
```

Keep the password in `genretv.cloud.env` or CI secrets, never in a tracked file.

## Dry run

Dry run is the default:

```sh
bun --env-file=genretv.cloud.env run canonical:propose:blogspot
```

For a repeatable investigation against saved HTML:

```sh
bun --env-file=genretv.cloud.env run canonical:propose:blogspot --source tmp/agents/blogspot-page.html
```

Use `--json` for machine-readable output. Ambiguous matches and Seasons deferred behind a new Show proposal
are reported but never submitted.

## Submit

After inspecting the dry run:

```sh
bun --env-file=genretv.cloud.env run canonical:propose:blogspot --submit
```

The command uses a persistent PGlite tooling store under `tmp/agents/blogspot-proposer-store`, loads the
canonical and proposal shapes, creates proposals through the pgxsinkit registry, and explicitly flushes and
reconciles before exiting.

## Matching and repeat runs

Shows match by existing deterministic ID, then IMDb identity, then an exact normalized title only when that
title identifies one canonical Show. Numbered Seasons match by parent Show, release kind, and season number;
other release rows require deterministic identity or an unambiguous label/title.

New Shows are proposed alone. Once accepted, the next run can propose their Seasons. This intentionally
avoids bundling parent and child review into one opaque operation.

Each proposal has a stable source fingerprint. An unchanged proposal is skipped forever after its first
submission, even if it was rejected or closed. A changed source value produces a new fingerprint.

## Maintainer review

Open Publishing, find Canonical proposals, and expand **Review accepted fields**. Each field can be omitted or
edited. **Approve + merge** is disabled while an accepted structured value is invalid or no fields are
selected. Approval stores the reviewed payload separately and merges only those fields.

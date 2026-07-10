# Regenerating Drizzle Migrations

Use this runbook only while the development migration history may still be replaced. Once a migration chain has been deployed as a stable release, add forward migrations instead of regenerating it.

## Why this is scripted

GenreTV's database is mostly represented by the current Drizzle schema, but three PostgreSQL concerns require sanctioned custom Drizzle migrations:

- canonical table grants, because Drizzle does not model `GRANT` and `REVOKE`;
- workflow review policy hardening, because the role-array checks require Supabase claim JSON expansion;
- workflow notification functions and triggers, because Drizzle does not model PL/pgSQL trigger functions.

The pgxsinkit clock utility must precede tables whose defaults call it, and the generated pgxsinkit mutation function must follow the complete schema and custom migrations. Hand-reconstructing that order is error-prone.

## Command

From the repository root:

```sh
bun run db:migrations:regenerate
```

The command:

1. verifies that exactly one copy of every sanctioned custom migration exists;
2. backs up the current `infra/drizzle` tree under `tmp/agents/drizzle-migration-regeneration`;
3. removes the existing migration chain;
4. generates the pgxsinkit clock utility;
5. generates one baseline from the current Drizzle schema;
6. recreates the canonical grants, workflow review policies, and notification fanout migrations in that order;
7. generates one current pgxsinkit sync artifact;
8. formats the generated migration artifacts.

If generation fails, the script restores the previous migration tree automatically. Raw SQL remains exclusively inside custom Drizzle migration files; the script carries those files forward rather than storing duplicate SQL templates.

## Verification

Run:

```sh
bun run seed:canonical
bun run validate
bun run test:integration
```

For a real empty-database proof, recreate the isolated E2E stack and run its browser suite. Never test a regenerated baseline by migrating an existing local development database whose migration ledger refers to the discarded chain.

```sh
bun run infra:e2e:down
bun run infra:e2e:up
bun run test:e2e
bun run infra:e2e:down
```

# Adding Drizzle Migrations

GenreTV's database migration lineage is released. Existing migrations and snapshots under `infra/drizzle/`
are immutable history. Every schema or database-program change is delivered as a new forward migration that
can upgrade an existing database without dropping or recreating it.

The pgxsinkit board demo intentionally uses disposable data and may rebuild its migration history. GenreTV
does not share that lifecycle; do not copy the demo's migration-reset workflow here.

## Schema changes

1. Update the typed Drizzle schema or pgxsinkit registry objects under `packages/domain/src/`.
2. Generate a named forward migration:

   ```sh
   bun run db:generate -- --name descriptive_change_name
   ```

3. Inspect the new `migration.sql`. It must alter the existing schema in place and preserve existing rows.
   Stop and redesign if it drops data, rebuilds the baseline, or depends on resetting a database.
4. If the registry contract changed, append a new generated pgxsinkit apply-function artifact after the
   schema migration:

   ```sh
   bun run db:sync-function:generate
   ```

5. Format and review the new migration and snapshot files. Never modify an older migration to make checks
   pass.

## Custom database programs

Drizzle does not model every PostgreSQL operation. Grants, PL/pgSQL functions, triggers, and similar Tier 3
SQL must still live inside the normal migration lineage:

```sh
bun run db:generate -- --custom --name descriptive_change_name
```

Put the minimum justified SQL in that newly generated custom migration. Do not create an independent SQL
file and do not edit the historical custom migration that originally introduced the object. Use idempotent
replacement forms only when the database operation requires them and the forward migration has been reviewed
for upgrade safety.

## Verification

Run the standard gates:

```sh
bun run validate
bun run test:integration
```

Then prove both database paths:

1. Apply the new migration to a representative database already carrying the complete released migration
   ledger. Confirm its data remains intact.
2. Create the disposable E2E database from the full chain and run the relevant browser coverage.

Recreating the E2E database is test isolation only. Never infer from that workflow that a persistent local or
cloud database may be dropped, or that committed migration history may be rewritten.

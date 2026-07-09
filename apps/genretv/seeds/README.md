# genretv Seeds

`blogspot-canonical.seed.json` is an intermediate canonical-list seed extracted from the current Blogspot page. It is intentionally season-entry oriented and preserves raw legacy cells alongside conservative normalization.

`canonical-registry.seed.json` is the derived database seed shape for the canonical pgxsinkit registry tables. It contains canonical show rows and canonical season rows with deterministic UUIDs.

The derived seed also contains a `quality` report. Blocking errors fail generation and `bun run validate`; warnings are accepted when they describe honest MVP gaps, such as missing country metadata from the source page or an `S6` row implying earlier unlisted seasons.

Same-title shows are merged only when the source has no conflicting external identity. If two same-title rows carry different IMDb title ids, they become separate canonical shows while retaining the same display title.

Regenerate from a saved HTML snapshot:

```sh
bun apps/genretv/scripts/extract-blogspot-seed.ts --input /tmp/genretv-blogspot.html --out apps/genretv/seeds/blogspot-canonical.seed.json
```

Regenerate directly from Blogspot:

```sh
bun apps/genretv/scripts/extract-blogspot-seed.ts --out apps/genretv/seeds/blogspot-canonical.seed.json
```

The direct fetch requires network access. The generated seed is not yet the final database seed shape; it is the source artifact future Drizzle/pgxsinkit seed code should consume.

Derive the canonical registry seed from the Blogspot artifact:

```sh
bun run seed:canonical
```

Check committed canonical seed quality without regenerating:

```sh
bun run seed:canonical:quality
```

Seed a local migrated Postgres database through typed Drizzle table objects:

```sh
bun run db:seed:canonical:local
```

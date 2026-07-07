# genretv Seeds

`blogspot-canonical.seed.json` is an intermediate canonical-list seed extracted from the current Blogspot page. It is intentionally season-entry oriented and preserves raw legacy cells alongside conservative normalization.

Regenerate from a saved HTML snapshot:

```sh
bun apps/genretv/scripts/extract-blogspot-seed.ts --input /tmp/genretv-blogspot.html --out apps/genretv/seeds/blogspot-canonical.seed.json
```

Regenerate directly from Blogspot:

```sh
bun apps/genretv/scripts/extract-blogspot-seed.ts --out apps/genretv/seeds/blogspot-canonical.seed.json
```

The direct fetch requires network access. The generated seed is not yet the final database seed shape; it is the source artifact future Drizzle/pgxsinkit seed code should consume.

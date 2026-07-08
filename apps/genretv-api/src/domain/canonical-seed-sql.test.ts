import { describe, expect, test } from "bun:test";

import { buildCanonicalRegistrySeedSql } from "./canonical-seed-sql";
import type { CanonicalRegistrySeedRows } from "./canonical-seed";

const rows: CanonicalRegistrySeedRows = {
  shows: [
    {
      id: "00000000-0000-5000-8000-000000000001",
      displayTitle: "Pilot's \"Show\"",
      originalTitle: null,
      languages: ["en"],
      countries: ["US"],
      genreTags: ["Sci-Fi"],
      externalLinks: [{ kind: "imdb", label: "IMDb", url: "https://example.test" }],
      notes: "quoted ' note",
    },
  ],
  seasons: [
    {
      id: "00000000-0000-5000-8000-000000000002",
      showId: "00000000-0000-5000-8000-000000000001",
      section: "upcoming",
      seasonLabel: "S1",
      timing: "Summer 2027",
      endedReason: "Unknown",
      releasePattern: "weekly",
      releasePrecision: "release_season",
      dateConfidence: "estimated",
      releaseWindow: {
        raw: "Summer 2027",
        precision: "release_season",
        confidence: "estimated",
        year: 2027,
        month: null,
        day: null,
        releaseSeason: "summer",
      },
      finaleWindow: null,
      sortKey: "2027-07-15",
      episodeCount: null,
      sourceRow: 10,
      organizations: [{ name: "Apple", role: "streamer", externalLinks: [] }],
      externalLinks: [],
      notes: null,
    },
  ],
};

describe("canonical registry seed SQL", () => {
  test("builds FK-ordered non-deleting upserts", () => {
    const sql = buildCanonicalRegistrySeedSql(rows);

    expect(sql.indexOf("INSERT INTO public.canonical_show")).toBeLessThan(
      sql.indexOf("INSERT INTO public.canonical_season"),
    );
    expect(sql).toContain("ON CONFLICT (id) DO UPDATE SET");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });

  test("escapes strings and casts JSON fields", () => {
    const sql = buildCanonicalRegistrySeedSql(rows);

    expect(sql).toContain("'Pilot''s \"Show\"'");
    expect(sql).toContain("'quoted '' note'");
    expect(sql).toContain(`'["en"]'::jsonb`);
    expect(sql).toContain(`'{"raw":"Summer 2027"`);
  });
});

import { describe, expect, test } from "bun:test";

import { chunkRows } from "./seed-canonical-registry";

describe("canonical registry seed batching", () => {
  test("splits cloud seed rows into bounded batches without losing order", () => {
    const rows = Array.from({ length: 764 }, (_, index) => index);

    const batches = chunkRows(rows, 250);

    expect(batches.map((batch) => batch.length)).toEqual([250, 250, 250, 14]);
    expect(batches.flat()).toEqual(rows);
  });

  test("rejects invalid batch sizes", () => {
    expect(() => chunkRows([1], 0)).toThrow("Batch size must be a positive integer");
  });
});

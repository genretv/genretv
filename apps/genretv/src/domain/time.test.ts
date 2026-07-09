import { describe, expect, test } from "bun:test";

import { formatMicrosecondTimestamp } from "./time";

describe("microsecond timestamp formatting", () => {
  test("accepts bigint, number, and string values from synced rows", () => {
    const timestamp = 1_700_000_000_000_000n;

    expect(formatMicrosecondTimestamp(timestamp)).not.toBe("");
    expect(formatMicrosecondTimestamp(Number(timestamp))).toBe(formatMicrosecondTimestamp(timestamp));
    expect(formatMicrosecondTimestamp(timestamp.toString())).toBe(formatMicrosecondTimestamp(timestamp));
  });

  test("returns an empty string for invalid timestamp values", () => {
    expect(formatMicrosecondTimestamp(null)).toBe("");
    expect(formatMicrosecondTimestamp("not-a-timestamp")).toBe("");
  });
});

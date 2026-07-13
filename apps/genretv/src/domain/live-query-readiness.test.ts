import { describe, expect, test } from "bun:test";

import { liveAggregateState } from "./live-query-readiness";

describe("live aggregate readiness", () => {
  test("does not report a hydrating empty snapshot as settled empty", () => {
    expect(liveAggregateState([{ loading: false, hydrating: true }], false)).toEqual({
      loading: true,
      empty: false,
    });
  });

  test("allows a cached usable snapshot to render during catch-up", () => {
    expect(liveAggregateState([{ loading: false, hydrating: true }], true)).toEqual({
      loading: false,
      empty: false,
    });
  });

  test("reports empty only after local loading and hydration settle", () => {
    expect(liveAggregateState([{ loading: false, hydrating: false }], false)).toEqual({
      loading: false,
      empty: true,
    });
  });

  test("waits for every local query snapshot", () => {
    expect(
      liveAggregateState(
        [
          { loading: false, hydrating: false },
          { loading: true, hydrating: false },
        ],
        true,
      ),
    ).toEqual({ loading: true, empty: false });
  });
});

import type { SyncTransactionResult } from "@pgxsinkit/client";
import { describe, expect, test } from "bun:test";

import { assertTransactionAcked } from "./mutation-acks";

describe("transaction ack assertions", () => {
  test("accepts an all-acked transaction", () => {
    expect(() =>
      assertTransactionAcked(
        {
          acks: [
            {
              entityKey: { id: "show-1" },
              mutationId: "00000000-0000-4000-8000-000000000001",
              mutationSeq: 1,
              serverUpdatedAtUs: "1",
              status: "acked",
              tableName: "personal_show",
            },
          ],
        },
        "Saving show overlay",
      ),
    ).not.toThrow();
  });

  test("throws with table, status, and reason for non-acked mutations", () => {
    const result = {
      acks: [
        {
          conflictReason: "stale base",
          entityKey: { id: "show-1" },
          mutationId: "00000000-0000-4000-8000-000000000002",
          mutationSeq: 1,
          status: "conflicted",
          tableName: "personal_show",
        },
        {
          entityKey: { id: "season-1" },
          httpStatus: 409,
          mutationId: "00000000-0000-4000-8000-000000000003",
          mutationSeq: 2,
          rejectionReason: "not allowed",
          status: "rejected",
          tableName: "personal_season",
        },
      ],
    } satisfies SyncTransactionResult;

    expect(() => assertTransactionAcked(result, "Saving overlay")).toThrow(
      "Saving overlay did not apply: personal_show: conflicted: stale base; personal_season: rejected: not allowed",
    );
  });
});

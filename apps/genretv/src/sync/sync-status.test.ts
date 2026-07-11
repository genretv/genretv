import { describe, expect, test } from "bun:test";

import { entityMutationState } from "../components/entity-sync-badge";
import { parseEntityKey, summarizeMutations, type LocalMutationState } from "./sync-status";

describe("synchronization status", () => {
  test("summarizes every durable journal state", () => {
    const mutations = [
      mutation("pending"),
      mutation("sending"),
      mutation("acked"),
      mutation("failed"),
      mutation("conflicted"),
      mutation("quarantined"),
      mutation("rejected"),
    ];

    expect(summarizeMutations(mutations)).toEqual({
      acked: 1,
      conflicted: 1,
      failed: 1,
      pending: 1,
      quarantined: 1,
      rejected: 1,
      sending: 1,
      total: 7,
    });
  });

  test("uses the most actionable entity state", () => {
    expect(entityMutationState([mutation("pending"), mutation("conflicted")], "personal_show", "row-1", true)).toEqual({
      color: "red",
      issue: true,
      label: "Conflict",
    });
    expect(entityMutationState([mutation("pending")], "personal_show", "row-1", false)).toEqual({
      color: "gray",
      issue: false,
      label: "Saved offline",
    });
  });

  test("ignores malformed and non-string entity keys", () => {
    expect(parseEntityKey("not json")).toEqual({});
    expect(parseEntityKey('{"id":"row-1","sequence":2}')).toEqual({ id: "row-1" });
  });
});

function mutation(status: string): LocalMutationState {
  return {
    attemptCount: 0,
    conflictReason: null,
    enqueuedAtUs: "1",
    entityKey: { id: "row-1" },
    lastError: null,
    lastHttpStatus: null,
    mutationId: `${status}-1`,
    mutationKind: "update",
    mutationSeq: 1,
    nextRetryAtUs: null,
    status,
    table: "personal_show",
  };
}

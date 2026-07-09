import type { SyncTransactionResult } from "@pgxsinkit/client";

export function assertTransactionAcked(result: SyncTransactionResult, action: string) {
  const failed = result.acks.filter((ack) => ack.status !== "acked");
  if (failed.length === 0) return;

  const details = failed.map((ack) => {
    const reason = ack.rejectionReason ?? ack.conflictReason ?? (ack.httpStatus == null ? null : `HTTP ${ack.httpStatus}`);
    return [ack.tableName, ack.status, reason].filter(Boolean).join(": ");
  });

  throw new Error(`${action} did not apply: ${details.join("; ")}`);
}

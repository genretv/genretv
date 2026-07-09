export function formatMicrosecondTimestamp(value: unknown): string {
  const millis = microsecondsToMillis(value);
  return millis == null ? "" : new Date(millis).toLocaleString();
}

function microsecondsToMillis(value: unknown): number | null {
  if (typeof value === "bigint") return safeNumberToMillis(Number(value));
  if (typeof value === "number") return safeNumberToMillis(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    return safeNumberToMillis(Number(trimmed));
  }
  return null;
}

function safeNumberToMillis(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const millis = Math.trunc(value / 1000);
  return Number.isFinite(millis) ? millis : null;
}

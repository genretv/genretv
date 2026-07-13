import { Checkbox, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

export interface ProposalPayloadReviewValue {
  payload: Record<string, unknown>;
  valid: boolean;
}

export function ProposalPayloadReview({
  onChange,
  proposedPayload,
}: {
  onChange: (value: ProposalPayloadReviewValue) => void;
  proposedPayload: unknown;
}) {
  const original = payloadRecord(proposedPayload);
  const fields = Object.keys(original).filter((field) => field !== "createInitialSeason");
  const [included, setIncluded] = useState(() => new Set(fields));
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field, editableValue(original[field])])),
  );

  if (fields.length === 0) return <Text size="xs">This proposal has no reviewable fields.</Text>;

  const commit = (nextIncluded: ReadonlySet<string>, nextDrafts: Record<string, string>) => {
    onChange(buildReviewedPayload(original, nextIncluded, nextDrafts));
  };

  return (
    <Stack gap="xs" className="proposal-payload-review" aria-label="Accepted proposal fields">
      {fields.map((field) => {
        const selected = included.has(field);
        const parsed = parseEditedValue(original[field], drafts[field] ?? "");
        return (
          <Stack key={field} gap={2}>
            <Checkbox
              size="xs"
              checked={selected}
              label={`Accept ${humanFieldName(field)}`}
              onChange={(event) => {
                const next = new Set(included);
                if (event.currentTarget.checked) next.add(field);
                else next.delete(field);
                setIncluded(next);
                commit(next, drafts);
              }}
            />
            <Textarea
              aria-label={`Accepted ${humanFieldName(field)} value`}
              autosize
              minRows={isStructuredValue(original[field]) ? 3 : 1}
              disabled={!selected}
              error={selected && !parsed.ok ? parsed.error : undefined}
              value={drafts[field] ?? ""}
              onChange={(event) => {
                const next = { ...drafts, [field]: event.currentTarget.value };
                setDrafts(next);
                commit(included, next);
              }}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}

export function buildReviewedPayload(
  original: Record<string, unknown>,
  included: ReadonlySet<string>,
  drafts: Readonly<Record<string, string>>,
): ProposalPayloadReviewValue {
  const payload: Record<string, unknown> = {};
  let valid = included.size > 0;
  for (const field of included) {
    if (!(field in original)) continue;
    const parsed = parseEditedValue(original[field], drafts[field] ?? "");
    if (!parsed.ok) {
      valid = false;
      continue;
    }
    payload[field] = parsed.value;
  }
  return { payload, valid };
}

export function payloadRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value == null || Array.isArray(value)) return {};
  const { createInitialSeason: _mergeInstruction, ...reviewable } = value as Record<string, unknown>;
  return reviewable;
}

function editableValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function parseEditedValue(
  original: unknown,
  value: string,
): { ok: true; value: unknown } | { error: string; ok: false } {
  if (typeof original === "string") return { ok: true, value };
  if (typeof original === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false, error: "Enter a number" };
  }
  if (typeof original === "boolean") {
    if (value === "true") return { ok: true, value: true };
    if (value === "false") return { ok: true, value: false };
    return { ok: false, error: "Enter true or false" };
  }
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false, error: "Enter valid JSON" };
  }
}

function isStructuredValue(value: unknown): boolean {
  return typeof value === "object" && value != null;
}

function humanFieldName(field: string): string {
  return field.replace(/([a-z])([A-Z])/g, "$1 $2").toLocaleLowerCase();
}

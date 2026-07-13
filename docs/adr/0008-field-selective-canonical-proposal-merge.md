# Field-Selective Canonical Proposal Merge

Canonical Maintainers will review Canonical Proposals through Field-Selective Merge rather than all-or-nothing acceptance. This lets maintainers promote useful submitted data into the Canonical List without accepting unrelated or lower-confidence changes, and avoids forcing maintainers to manually re-enter the good parts of a proposal.

## Decision

`canonical_proposal.proposed_payload` is immutable evidence of what the proposer submitted. A maintainer
reviews its top-level fields independently, may edit accepted values, and may omit fields that should not be
merged. Approval stores that exact sparse object in `reviewed_payload` and applies only those keys to an
existing canonical row.

For a newly created canonical row, the merge planner still supplies schema-safe defaults for omitted optional
data. A normal manually proposed Show creates an initial Season 1 row. An importer may explicitly set the
proposal-only `createInitialSeason` instruction to `false`; this prevents inventing a numbered season for a
show whose first scraped release might instead be a movie, special, pilot, or a later numbered season.

Rejecting or closing a proposal does not create a reviewed payload. The submitted payload remains available
for audit and for explaining the decision.

## Source proposals

Automated source importers use the same Canonical Proposal table and publisher permissions as people. Source
metadata is explicit rather than hidden inside notes:

- `source_kind` identifies the importer;
- `source_url` records the canonical page inspected;
- `source_observed_at_us` records when that source was fetched;
- `source_fingerprint` identifies the source row, target, and proposed values.

The fingerprint is unique when present. Re-running an importer therefore cannot create the same proposal
twice, regardless of the proposal's eventual workflow status. A meaningful later source change produces a
different fingerprint and can be proposed normally.

## Consequences

- Updates are sparse and cannot clear unrelated metadata merely because the proposer omitted it.
- Maintainers can accept with modifications without rewriting a proposal or losing its original contents.
- Import scripts need no privileged database channel and cannot bypass proposal review.
- Payload fields used only as merge instructions must be explicitly ignored by canonical row patches.

# 0001. Derive `last_visit` from notes

- Status: accepted
- Date: 2026-11-05

## Context
The patient list shows a "last visit" date and can sort by it. Each note carries a clinical timestamp (`recorded_at`).

## Options
- **A. An API-maintained column** on `patients`: cheap to read and sort, but every note create or delete must update it, and it can drift.
- **B. Derive it** as `MAX(notes.recorded_at)` per patient.

## Decision
B. `last_visit` is computed in the query, through a correlated subquery or a lateral join, and is never stored.

## Consequences
- There is one source of truth, so `last_visit` can't drift when notes are deleted or backdated.
- A composite index on `notes (patient_id, recorded_at DESC)` keeps sorting and the per-row lookup fast at thousands of patients.
- Patients without notes have `last_visit = null`. Sorting puts them last (`NULLS LAST`).
- If the volume ever grows past what the index can handle, the fallback is a materialized column kept in sync by a trigger. That's an internal change, and the API stays the same.

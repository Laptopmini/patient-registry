# 0003. Soft-delete patients

- Status: accepted
- Date: 2026-11-05

## Context
`DELETE /patients/{id}` must remove a patient from the registry. Medical records are normally kept for years, and deleting them is risky.

## Options
- **Soft delete**: set `archived_at`, and hide archived patients from every read.
- **Hard delete**, cascading to notes, allergies and conditions.

## Decision
Soft delete. `DELETE` sets `archived_at = now()` and returns `204`. After that, every endpoint answers `404` for that patient, including its notes and summary. A repeated `DELETE` also returns `404`.

## Consequences
- Records survive an accidental delete. An admin restore endpoint can be added later, with roles.
- Every patient query filters on `archived_at IS NULL`. Partial indexes (`WHERE archived_at IS NULL`) keep that fast. A shared query helper means no endpoint can forget the filter, and tests cover it.
- Notes are still hard-deleted individually (`DELETE .../notes/{note_id}`). The audit log (see the README section "Designed to grow") would cover them.
- Truly erasing data (for example, at a data-subject request) would need a separate purge process.

# 0002. Store allergies and conditions in child tables

- Status: accepted
- Date: 2026-11-05

## Context
Patients have zero or more allergies and conditions. The list can filter by them, and the summary reports them.

## Options
- **Postgres `text[]` with a GIN index**: simple, and fits PUT replacement well, but it has no room for per-item metadata.
- **Child tables** (`patient_allergies`, `patient_conditions`): normalized, and leave room for severity, coded vocabularies (such as SNOMED CT) and onset dates later.

## Decision
Child tables, each with `id`, `patient_id` (FK, `ON DELETE CASCADE`) and `name`, plus a unique constraint on `(patient_id, lower(name))`.
In the API each item is an object (`{"name": "Penicillin"}`), never a bare string, so fields can be added later without breaking clients.

## Consequences
- Fields such as severity, reaction or code can be added later without breaking changes.
- `PUT /patients/{id}` replaces the whole set in one transaction (delete and insert). It's simple and correct, because PUT means full replacement.
- Reads load the items with `selectinload`, so there are no N+1 queries. Filters use `EXISTS` subqueries, with a trigram index on `name`.
- This is more code than an array column: two more models and more test cases.

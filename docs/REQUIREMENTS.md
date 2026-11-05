# Requirements

Each requirement has a stable ID. Code, tests, commits and reviews refer to requirements by these IDs. The status is one of `planned`, `in progress`, `done` or `n/a`.
**Where** points at the implementing code; **Test** names the test(s) that prove it.

## R-1 Foundation

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-1.1 | The web client is a React + TypeScript single-page app built with Vite. | in progress | `apps/web` | — |
| R-1.2 | The web client has an explicit, documented choice of component library, server/client state management, router and styling approach. | in progress | `docs/decisions/` | — |
| R-1.3 | Linting and formatting are configured and enforced for both apps. | in progress | `apps/web/biome.json`, `apps/api/pyproject.toml` | — |
| R-1.4 | TypeScript runs in strict mode. | in progress | `apps/web/tsconfig*.json` | — |
| R-1.5 | The API is a FastAPI service exposing `GET /health`, which answers `{"status": "ok"}`. | done | `apps/api/src/app/main.py` | `tests/api/test_platform.py::test_health` |
| R-1.6 | Patient data lives in PostgreSQL, and any developer can recreate the schema from versioned migrations. | done | `apps/api/migrations/`, `alembic.ini` | `tests/api/test_platform.py::TestMigrations` |
| R-1.7 | On startup the database is seeded idempotently with at least 15–20 realistic synthetic patients. | done | `apps/api/src/app/seed.py` | `tests/api/test_seed.py`, `tests/unit/test_seed_data.py` |

## R-2 Dashboard and patient CRUD

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-2.1 | `GET /patients` returns a paginated list. | done | `routers/patients.py`, `services/patients.py` | `tests/api/test_patients_list.py` |
| R-2.2 | `GET /patients/{id}` returns one patient. | done | `routers/patients.py` | `tests/api/test_patients_crud.py::TestRead` |
| R-2.3 | `POST /patients` creates a patient. | done | `routers/patients.py` | `tests/api/test_patients_crud.py::TestCreate` |
| R-2.4 | `PUT /patients/{id}` updates a patient (full replacement). | done | `routers/patients.py` (ETag / If-Match) | `tests/api/test_patients_crud.py::TestReplace` |
| R-2.5 | `DELETE /patients/{id}` removes a patient from the registry. | done | `routers/patients.py` (soft delete, ADR 0003) | `tests/api/test_patients_crud.py::TestDelete` |
| R-2.6 | The app shell is responsive and has a header with navigation, a sidebar and a main content region. | planned | — | — |
| R-2.7 | The patient list shows each patient's name, age, last visit and status, as rows or cards. | planned | — | — |
| R-2.8 | The patient list can be searched and filtered. | planned | — | — |
| R-2.9 | The patient list can be sorted. | planned | — | — |
| R-2.10 | The patient list is paginated (or scrolls infinitely). | planned | — | — |
| R-2.11 | Routes exist for the dashboard home `/`, the list `/patients`, a patient `/patients/:id`, and a not-found page. | planned | — | — |
| R-2.12 | The list stays efficient with well over 100 patients. | planned | — | — |
| R-2.13 | Typing in search never blocks the UI. | planned | — | — |
| R-2.14 | The UI works on small, low-resolution screens. | planned | — | — |
| R-2.15 | The API validates input and answers with the appropriate HTTP status codes. | done | `apps/api/src/app/errors.py`, `schemas/` | `tests/api/test_patients_crud.py::TestCreate::test_validation_errors`, `tests/api/test_platform.py::TestErrorHandlers` |

## R-3 Clinical notes and summary

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-3.1 | `POST /patients/{id}/notes` attaches a note, made of a timestamp and text, to a patient. | done | `routers/notes.py` | `tests/api/test_notes_and_summary.py::TestCreateNote` |
| R-3.2 | `GET /patients/{id}/notes` lists a patient's notes. | done | `routers/notes.py` | `tests/api/test_notes_and_summary.py::TestListNotes` |
| R-3.3 | `DELETE /patients/{id}/notes/{note_id}` removes a note. | done | `routers/notes.py` | `tests/api/test_notes_and_summary.py::TestGetAndDeleteNote` |
| R-3.4 | `GET /patients/{id}/summary` returns a readable summary with identifiers (name, age, blood type), a narrative drawn from the notes, and key clinical facts (conditions, allergies). | done | `routers/summary.py`, `summary/` | `tests/api/test_notes_and_summary.py::TestSummary`, `tests/unit/test_logic.py::TestTemplateProvider` |
| R-3.5 | The patient view shows notes with their timestamps, a form to add one, and a way to delete one. | planned | — | — |
| R-3.6 | The patient view shows the generated summary. | planned | — | — |

## R-4 Patient form

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-4.1 | A form captures personal details: name, date of birth, contact details and address. | planned | — | — |
| R-4.2 | The form captures medical details: allergies, conditions, blood type and status. | planned | — | — |
| R-4.3 | Input is validated on the client and again on the server. | planned | — | — |
| R-4.4 | Users see clear, specific error messages. | planned | — | — |
| R-4.5 | Network failures are handled without losing the user's input. | planned | — | — |
| R-4.6 | Validation errors from the server are shown on the matching fields. | planned | — | — |

## R-5 Containers and delivery

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-5.1 | The API ships with a Dockerfile. | done | `apps/api/Dockerfile` | Image built and `/health` checked against a throwaway Postgres (Stage 2 verification) |
| R-5.2 | The web client ships with a Dockerfile. | done | `apps/web/Dockerfile`, `apps/web/docker/Caddyfile` | `scripts/smoke.sh` (CI `stack` job) |
| R-5.3 | One `docker-compose.yml` starts the API, PostgreSQL and the web client. | done | `docker-compose.yml` (db, migrate, flagd, api, web, all with health checks) | `scripts/smoke.sh`, clean-clone run |
| R-5.4 | `.env.example` documents every environment variable. | done | `.env.example` | — |
| R-5.5 | The README is complete but brief, and explains how to run the project locally. | planned | — | — |
| R-5.6 | The code is published in a public GitHub repository (owner action). | planned | — | — |

## R-S Stretch goals

Chosen focus: **Advanced Backend** (R-S.1–R-S.3) and **Testing & Quality** (R-S.4–R-S.6). The rest are backlog items, done in order as time allows.

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-S.1 | The list endpoint accepts sorting and filtering query parameters. | done | `services/patients.py` (`q`, `status`, `blood_type`, `condition`, `allergy`, `sort`) | `tests/api/test_patients_list.py` |
| R-S.2 | Middleware logs every request. | done | `apps/api/src/app/logging.py` | `tests/api/test_platform.py::TestRequestLogging` |
| R-S.3 | Schema changes are managed with Alembic migrations. | done | `apps/api/migrations/` | `tests/api/test_platform.py::TestMigrations` |
| R-S.4 | API endpoints have automated tests. | done | `apps/api/tests/` | `uv run pytest`: 170 tests, 98% line coverage |
| R-S.5 | Critical UI components have component tests. | planned | — | — |
| R-S.6 | The main user journeys have end-to-end tests. | planned | — | — |
| R-S.7 | Users can switch between light and dark themes manually. | planned | — | — |
| R-S.8 | Advanced search combines several filters. | planned | — | — |
| R-S.9 | Large patient lists are virtualized. | planned | — | — |
| R-S.10 | The dashboard charts patients by status. | planned | — | — |
| R-S.11 | Routes are code-split and lazy-loaded, and an audit confirms it. | planned | — | — |
| R-S.12 | A CI pipeline runs all checks. | in progress | `.github/workflows/ci.yml` (api, web, compose smoke; e2e and Lighthouse added in Stage 6) | — |
| R-S.13 | Both apps hot-reload inside Docker. | done | `compose.dev.yaml`, `make watch` | Verified manually: Vite module update and uvicorn reload |
| R-S.14 | Natural-language search turns a free-text query into filters, behind a flag. | planned | — | — |
| R-S.15 | A read-only MCP server exposes the patient API. | planned | — | — |

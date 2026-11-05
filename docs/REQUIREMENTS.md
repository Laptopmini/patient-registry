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
| R-1.5 | The API is a FastAPI service exposing `GET /health`, which answers `{"status": "ok"}`. | in progress | `apps/api` | — |
| R-1.6 | Patient data lives in PostgreSQL, and any developer can recreate the schema from versioned migrations. | planned | — | — |
| R-1.7 | On startup the database is seeded idempotently with at least 15–20 realistic synthetic patients. | planned | — | — |

## R-2 Dashboard and patient CRUD

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-2.1 | `GET /patients` returns a paginated list. | planned | — | — |
| R-2.2 | `GET /patients/{id}` returns one patient. | planned | — | — |
| R-2.3 | `POST /patients` creates a patient. | planned | — | — |
| R-2.4 | `PUT /patients/{id}` updates a patient (full replacement). | planned | — | — |
| R-2.5 | `DELETE /patients/{id}` removes a patient from the registry. | planned | — | — |
| R-2.6 | The app shell is responsive and has a header with navigation, a sidebar and a main content region. | planned | — | — |
| R-2.7 | The patient list shows each patient's name, age, last visit and status, as rows or cards. | planned | — | — |
| R-2.8 | The patient list can be searched and filtered. | planned | — | — |
| R-2.9 | The patient list can be sorted. | planned | — | — |
| R-2.10 | The patient list is paginated (or scrolls infinitely). | planned | — | — |
| R-2.11 | Routes exist for the dashboard home `/`, the list `/patients`, a patient `/patients/:id`, and a not-found page. | planned | — | — |
| R-2.12 | The list stays efficient with well over 100 patients. | planned | — | — |
| R-2.13 | Typing in search never blocks the UI. | planned | — | — |
| R-2.14 | The UI works on small, low-resolution screens. | planned | — | — |
| R-2.15 | The API validates input and answers with the appropriate HTTP status codes. | planned | — | — |

## R-3 Clinical notes and summary

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-3.1 | `POST /patients/{id}/notes` attaches a note, made of a timestamp and text, to a patient. | planned | — | — |
| R-3.2 | `GET /patients/{id}/notes` lists a patient's notes. | planned | — | — |
| R-3.3 | `DELETE /patients/{id}/notes/{note_id}` removes a note. | planned | — | — |
| R-3.4 | `GET /patients/{id}/summary` returns a readable summary with identifiers (name, age, blood type), a narrative drawn from the notes, and key clinical facts (conditions, allergies). | planned | — | — |
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
| R-5.1 | The API ships with a Dockerfile. | planned | — | — |
| R-5.2 | The web client ships with a Dockerfile. | planned | — | — |
| R-5.3 | One `docker-compose.yml` starts the API, PostgreSQL and the web client. | planned | — | — |
| R-5.4 | `.env.example` documents every environment variable. | planned | — | — |
| R-5.5 | The README is complete but brief, and explains how to run the project locally. | planned | — | — |
| R-5.6 | The code is published in a public GitHub repository (owner action). | planned | — | — |

## R-S Stretch goals

Chosen focus: **Advanced Backend** (R-S.1–R-S.3) and **Testing & Quality** (R-S.4–R-S.6). The rest are backlog items, done in order as time allows.

| ID | Requirement | Status | Where | Test |
|----|-------------|--------|-------|------|
| R-S.1 | The list endpoint accepts sorting and filtering query parameters. | planned | — | — |
| R-S.2 | Middleware logs every request. | planned | — | — |
| R-S.3 | Schema changes are managed with Alembic migrations. | planned | — | — |
| R-S.4 | API endpoints have automated tests. | planned | — | — |
| R-S.5 | Critical UI components have component tests. | planned | — | — |
| R-S.6 | The main user journeys have end-to-end tests. | planned | — | — |
| R-S.7 | Users can switch between light and dark themes manually. | planned | — | — |
| R-S.8 | Advanced search combines several filters. | planned | — | — |
| R-S.9 | Large patient lists are virtualized. | planned | — | — |
| R-S.10 | The dashboard charts patients by status. | planned | — | — |
| R-S.11 | Routes are code-split and lazy-loaded, and an audit confirms it. | planned | — | — |
| R-S.12 | A CI pipeline runs all checks. | planned | — | — |
| R-S.13 | Both apps hot-reload inside Docker. | planned | — | — |
| R-S.14 | Natural-language search turns a free-text query into filters, behind a flag. | planned | — | — |
| R-S.15 | A read-only MCP server exposes the patient API. | planned | — | — |

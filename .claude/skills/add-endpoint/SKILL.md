---
name: add-endpoint
description: Add or change an API endpoint end to end — model, schema, router, migration, tests and the regenerated web client. Use whenever an API route is added or its contract changes.
---

# Add an endpoint

Work through every step. A contract change isn't done until the web client is regenerated.

1. **Requirement:** find the `R-x.y` row in `docs/REQUIREMENTS.md` that this endpoint serves. If none fits, stop and ask.
2. **Model** (only if the data model changes): edit `apps/api/src/app/models/`, then follow the `add-migration` skill.
3. **Schemas:** add Pydantic v2 request and response models in `apps/api/src/app/schemas/`. Put validation here: constrained types, `EmailStr`, E.164 phone numbers.
4. **Service:** put the business logic in `apps/api/src/app/services/`. It takes an `AsyncSession` and knows nothing about HTTP.
5. **Router:** add the route in `apps/api/src/app/routers/`. Declare `response_model` and `status_code`, and document every error status in `responses=` (all of them problem+json). Soft-deleted patients answer `404`.
6. **Tests:** cover the service with unit tests in `tests/unit/`. Cover the success path and every error path (`404`, `409`/`412`, `422` with field details) with API tests in `tests/api/`.
7. **Contract:** run `make openapi` to export `apps/api/openapi.json`, then `make client` to regenerate `apps/web/src/api/generated/`. Commit both.
8. **Verify:** `make check` must pass. Update the requirement row (status, where, test).

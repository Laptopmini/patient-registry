# 0011. Orval generates the web API client and Zod schemas

- Status: accepted
- Date: 2026-11-05

## Context
FastAPI's OpenAPI schema (`apps/api/openapi.json`) is the contract. The web app needs typed API calls, TanStack Query bindings and Zod schemas for forms, all generated from that schema. CI must fail when the generated code is stale. The deciding factor is production reliability.

## Options
- **Hey API openapi-ts**: one config for the SDK, Zod and TanStack Query, but pre-1.0, so a minor release can break things.
- **Orval 8**: stable under semver and widely used, with Zod, React Query and MSW output. The output is more opinionated and bulkier.
- **openapi-typescript + openapi-fetch**: minimal, but has no Zod output, so form schemas would drift.

## Decision
Orval 8, version pinned. It generates React Query hooks and a Zod output into `apps/web/src/api/generated/`, which is never edited by hand. A custom fetch mutator (`src/api/http.ts`) handles the base URL (`/api`), abort signals, `If-Match`/`ETag`, and parsing problem+json into a typed `ApiError`.

## Consequences
- Types, hooks and validation all come from the same contract. `make client` regenerates them, and CI checks for drift with `git diff --exit-code`.
- Our own error and concurrency logic lives in one small mutator, not in generated code.
- Generated code is committed and excluded from Biome. Diffs in it show up in reviews, but they're mechanical.

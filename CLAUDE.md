# patient-registry

A patient management dashboard: a FastAPI service (`apps/api`), a React SPA (`apps/web`) and PostgreSQL.

## Commands
- `make install`: install dependencies and git hooks
- `make up` / `make watch` / `make down`: run the stack in Docker (hot reload with `watch`)
- `make check`: lint, typecheck and test both apps. Run it before you say anything is done.
- `make e2e`: Playwright and axe checks, against a running stack
- API only: `cd apps/api && uv run pytest | uv run ruff check . | uv run pyright`
- Web only: `cd apps/web && pnpm test | pnpm lint | pnpm typecheck`

## Rules
- Scope comes from `docs/REQUIREMENTS.md` (IDs `R-x.y`). Progress is tracked in `docs/PLAN.md`, and decisions in `docs/decisions/`.
- Never commit `.local/`. Never commit secrets. Data must be synthetic only (Faker, fixed seed) and labelled as such.
- Commits: Conventional Commits, small and self-contained. No co-author or AI trailers.
- Dependencies: check the registry for the current stable version. Lockfiles (`uv.lock`, `pnpm-lock.yaml`) pin versions.
- API: errors are RFC 9457 `application/problem+json`. PUT means full replacement. Sort fields come from an allowlist. Logs never include request bodies or patient fields.
- API contract: FastAPI's OpenAPI schema is the source of truth. After an API change, regenerate the web client and commit it.
- Web: server state lives in TanStack Query, and list state in the URL (TanStack Router search params). No global client store.
- React Compiler is on: no manual `useMemo`/`useCallback`/`memo` unless profiling shows they help. With react-hook-form, use `useWatch`, never `watch()`.
- UI: React Aria Components with CSS Modules and the tokens in `tokens.css`. Meet WCAG 2.2 AA: touch targets of 44px or more, a visible focus ring, no motion under `prefers-reduced-motion`.
- **Design handoff:** files in `design/handoff/` are visual references only. Rebuild them as real React Aria components with CSS Modules. Never copy their markup or class names.

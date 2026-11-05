# Delivery plan

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` skipped (with reason).
Each stage ends with a check-in, and the next stage starts only after the owner approves. Once a stage is approved, `main` is pushed to `origin`.

## Resume point

> **Current:** Stage 5, run 5a merged; run 5b in progress (`frontend-engineer` worktree, `docs/plan/stage-5.md` run 5b plus the "Run 5b additions").
> **Next action:** review and merge 5b, compare with Playwright MCP, then check in. If the agent was lost, relaunch run 5b from the brief.

A new session resumes here: read this file, `CLAUDE.md`, `docs/REQUIREMENTS.md` and `docs/decisions/README.md`, then continue at the next action.

## Working rules (summary)

- Specialist subagents (`.claude/agents/`) start from a written brief in `docs/plan/stage-N.md`. Each works in its own git worktree, at most 2 run at once, and each report is at most 150 words.
- Decisions that shape the architecture go to the owner as options and are recorded as ADRs in `docs/decisions/`.
- Verification before every check-in: lint, typecheck and tests for every area touched.

## Stage 0: Plan and decide
- [x] Read the brief
- [x] `docs/REQUIREMENTS.md`
- [x] `docs/PLAN.md`
- [x] Decisions (2 rounds) and ADRs 0001–0010
- [x] Push policy: pre-approved after each approved stage
- [x] Scaffold: layout, `apps/api`, `apps/web`, Makefile, lefthook + commitlint, `.editorconfig`, `.gitignore`, README placeholder
- [x] Agent setup: `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, agents, skills, `.mcp.json`
- [x] Verify (`make check`), commit, check in

## Stage 1: Design handoff package (main session)
- [x] `design/brief/01-product.md` … `07-return-package.md` (7 files)
- [x] `design/CLAUDE_DESIGN_PROMPT.md`
- [x] Check in. While the owner works in Claude Design, Stages 2–4 continue

## Stage 2: Backend (`backend-engineer`, worktree)
- [x] Brief: `docs/plan/stage-2.md`
- [x] Models (patients, allergies, conditions, notes), Alembic migrations, idempotent seed (Faker, fixed seed, `SEED_PATIENTS`)
- [x] Patient CRUD with ETag/If-Match, soft delete, offset pagination, allowlisted sort, pg_trgm search, filters
- [x] Notes endpoints; summary endpoint with the `template` provider and caching
- [x] Problem-details errors, request-ID + JSON logging middleware, `/health`
- [x] OpenAPI export (`apps/api/openapi.json`)
- [x] Unit and API tests against real Postgres
- [x] Dockerfile: multi-stage, non-root user
- [x] Review the diff and merge

## Stage 3: Compose and developer setup
- [x] `docker-compose.yml`: db, migrate, api, flagd, web; health checks; `watch`
- [x] `.env.example`, Makefile targets, CI workflow, lefthook verified
- [x] Clean-clone check: `docker compose up` brings up a healthy, seeded API

## Stage 4: Frontend foundation (`frontend-engineer`, worktree)
- [x] Brief: `docs/plan/stage-4.md` (+ ADR 0011, Orval)
- [x] Generated client and Zod schemas, plus a drift check
- [x] Router (lazy routes), query layer, layout shell
- [x] List: URL state, server-side search, filter, sort and pagination
- [x] Detail: profile, notes, summary
- [x] Form: client validation, server 422 errors mapped to fields, retry on network failure
- [x] 404 page and error boundaries
- [x] Component tests (list, form, notes); Dockerfile (Caddy and dev targets)
- [x] Review the diff and merge

## Stage 5: Design implementation (`design/handoff/` committed in 948dd80)
- [x] Brief: `docs/plan/stage-5.md` (runs 5a and 5b)
- [x] Run 5a: tokens, font, stylelint, shell, primitives, styleguide, list, detail, dialogs
- [~] Run 5b: create wizard, edit, unsaved-changes guard, dashboard, 404, states, motion
- [ ] Compare with Playwright MCP at 360, 768 and 1280px, in light and dark

## Stage 6: Quality gate and core release
- [ ] e2e tests for the main journeys, with an axe scan on every route (`qa-reviewer`)
- [ ] Lighthouse CI scoring 95 or higher in every category
- [ ] `anthropic` summary provider behind its flag
- [ ] README complete
- [ ] Every row in `REQUIREMENTS.md` is `done`
- [ ] Tag `v1.0.0`

## Stage 7: Stretch backlog (one check-in per item)
- [ ] Verify the Advanced Backend and Testing & Quality items are complete and documented
- [ ] Manual theme toggle (R-S.7)
- [ ] Advanced search with filters (R-S.8)
- [ ] Virtualized list with the 1,000-patient seed (R-S.9)
- [ ] Patient status chart (R-S.10)
- [ ] Code-splitting audit (R-S.11)
- [ ] Natural-language search, behind a flag (R-S.14)
- [ ] Read-only MCP server (R-S.15)

## Stage 8: Security review
- [ ] The owner runs `/security-audit`
- [ ] Triage the findings, fix the confirmed ones with tests, write `docs/SECURITY.md`

## Stage 9: Judge and iterate (`requirements-judge`)
- [ ] Independent review saved to `.local/review-N.md`; fix and repeat until every criterion scores 4 or higher

## Stage 10: Release
- [ ] Clean-clone smoke test
- [ ] Final README pass
- [ ] `docs/AI-WORKFLOW.md`
- [ ] Hand over (the owner makes the repo public)

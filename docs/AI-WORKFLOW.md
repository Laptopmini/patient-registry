# AI-assisted workflow

This project is built by a small team: one human owner and a set of AI agents in Claude Code. This page describes how that team works: who decides, how work is briefed and checked, and what the repository provides so agents can work in it safely.

## Roles
- **Owner** (human): sets the scope, makes every decision that shapes the architecture, a library, the API or the data model, approves each stage, and owns every commit and every public action (pushes, releases, making the repo public).
- **Tech lead** (the main Claude Code session): plans the stages, presents decisions, writes the briefs, reviews and merges the specialists' work, and writes the cross-cutting docs. It keeps `docs/PLAN.md` current, so any new session can resume from that file alone.
- **Specialists** (subagents defined in [`.claude/agents/`](../.claude/agents/)):
  - `backend-engineer`: FastAPI, the database, pytest.
  - `frontend-engineer`: React, Vitest, Playwright.
  - `qa-reviewer`: runs the checks and reads code. It never edits.
  - `requirements-judge`: an independent scorer that gets no build history.

  Specialists run on a model suited to their task. Mechanical work goes to a cheaper model.

## How decisions are made
1. The tech lead presents each architectural decision to the owner as 2–3 real options, with a recommendation and a one-line tradeoff for each. Related decisions are grouped to keep interruptions down.
2. The owner decides, and may question the recommendation first.
3. The outcome is recorded as a short ADR (Context, Options, Decision, Consequences) in [`docs/decisions/`](decisions/README.md).

Small, conventional choices (file layout, helpers, lint rules) are the tech lead's to make. Scope lives in [`docs/REQUIREMENTS.md`](REQUIREMENTS.md): every requirement has a stable ID, a status, where it's implemented, and the test that proves it.

## How work is briefed, isolated, reviewed and merged
- **Briefs:** each stage has a written brief in [`docs/plan/`](plan/) (`stage-N.md`). It covers scope, contracts, constraints and "done when" checks. Specialists start from the brief, not from chat history, so their context stays small and the instructions can be reviewed.
- **Isolation:** each specialist works in its own git worktree on its own branch, with at most two running at once. Parallel runs are split by area (for example API and web) so they never edit the same files.
- **Reports:** a specialist finishes with a report of at most 150 words: what changed, how it was verified, and open questions.
- **Review:** the tech lead reads the diff selectively. It checks the contract, error paths, privacy rules (no PHI in logs or browser storage), memoization and accessibility conventions, and screenshots compared with the design references. It then re-runs every check itself, rebases the branch onto `main`, and fast-forwards, which keeps history linear.
- **Commits:** small Conventional Commits (`feat(api): …`, `test(web): …`), all authored by the owner. `commitlint` checks the messages.
- **Check-ins:** each stage ends with a summary of at most 10 lines (what was done, how it was verified, what's next) and waits for the owner's approval. Pushes happen only after that.

## Verification gates
| Gate | Where | What it checks |
|---|---|---|
| Format on edit | `.claude/settings.json` hook | Ruff or Biome formats every file an agent edits |
| Pre-commit | `lefthook.yml` | Biome and Ruff on staged files; commitlint on the message |
| Local | `make check` | Lint (Ruff, Biome, stylelint for tokens), typecheck (pyright strict, `tsc` strict), unit and API tests against real Postgres |
| Contract | CI | The OpenAPI schema and the generated web client must both be up to date |
| Stack | CI | `docker compose up --wait` plus a smoke test through the web entrypoint |
| Journeys and accessibility | CI | Playwright e2e for the main user flows, axe (WCAG 2.2 AA) on every route in both themes, a reduced-motion check |
| Performance | CI | Lighthouse CI at 95 or higher in every category |
| Security | [`SECURITY.md`](SECURITY.md) | A documented threat model, the controls in place and the known limitations |

Nothing counts as done until it has been run. Failures are reported as failures.

## Repository features for agents
- [`CLAUDE.md`](../CLAUDE.md): short rules and commands only. [`AGENTS.md`](../AGENTS.md) points to it for other tools.
- [`.claude/settings.json`](../.claude/settings.json): an allowlist of safe commands, denials for `.env` reads and force pushes, and the format-on-edit hook.
- [`.claude/skills/`](../.claude/skills/):
  - `add-endpoint`: model, schema, service, router, tests, OpenAPI export and regenerated client, in order.
  - `add-migration`: an Alembic migration with a manual review checklist and an up/down/up round trip.
- [`.mcp.json`](../.mcp.json): Playwright MCP, so agents can drive and inspect the running UI.
- The Makefile gives one-word commands (`make up`, `make check`, `make e2e`) that agents and people use alike.

## Design handoff
1. The tech lead writes a design package in [`design/brief/`](../design/brief/): product, user flows, data model, synthetic sample data, screens and states, technical constraints (React Aria Components, CSS-variable tokens, WCAG 2.2 AA, Lighthouse budget), and the exact return package expected. It also writes a ready-to-paste prompt, [`design/CLAUDE_DESIGN_PROMPT.md`](../design/CLAUDE_DESIGN_PROMPT.md).
2. The owner iterates with Claude Design on visual directions and screens, then approves.
3. Claude Design returns [`design/handoff/`](../design/handoff/): `tokens.css` for both themes, screen references at 360, 768 and 1280px in light and dark, a component inventory with every state, a motion spec, and `HANDOFF.md`, an implementation prompt for this session.
4. Before the handoff is committed, the tech lead reviews it against the engineering decisions and appends an "Engineering overrides" section where they differ.
5. The handoff files are **visual references only**. Every screen is rebuilt from React Aria Components and CSS Modules, never from the design's markup. Specialists check their work by capturing each screen with Playwright, in the reference viewport and time zone, comparing it with the reference image, and running axe on every capture.

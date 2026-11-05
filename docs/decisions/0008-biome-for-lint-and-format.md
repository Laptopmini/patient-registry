# 0008. Biome for TypeScript lint and format

- Status: accepted
- Date: 2026-11-05

## Context
The web app needs linting and formatting that are fast enough for a post-edit hook and for CI.

## Options
- **Biome**: one fast binary that both lints and formats.
- **ESLint + Prettier**: a larger plugin ecosystem, but two tools and more configuration.

## Decision
Biome for `apps/web`, and Ruff (lint and format) for `apps/api`.

## Consequences
- Each language has one command and one config file, and runs in milliseconds, so it's practical in hooks.
- Some niche ESLint plugins have no Biome equivalent. `tsc --noEmit` and the axe e2e checks cover what's left of type and accessibility safety.

# 0006. TanStack Router

- Status: accepted
- Date: 2026-11-05

## Context
The list's search, filter, sort and page state lives in the URL, so views can be shared and survive a reload. Routes are lazy-loaded.

## Options
- **TanStack Router**: search params are typed and validated, and routes are file-based with automatic code splitting.
- **React Router 8**: familiar, but search params are untyped strings that we would parse by hand.

## Decision
TanStack Router, with file-based routes through its Vite plugin (`autoCodeSplitting`). Each route validates its search params with a Zod schema.

## Consequences
- List state can't be invalid: bad query strings fall back to defaults when the Zod schema parses them.
- It works naturally with TanStack Query: loaders can prefetch, and query keys come from the search params.
- Fewer developers know it than React Router. The generated `routeTree.gen.ts` is committed, and Biome ignores it.

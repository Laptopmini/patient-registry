# 0007. React Hook Form with Zod

- Status: accepted
- Date: 2026-11-05

## Context
The patient form needs client-side validation that matches the server's rules, server `422` errors mapped back onto fields, and dynamic lists (allergies, conditions).

## Options
- **React Hook Form + Zod**: mature and widely known. `zodResolver` uses the Zod schemas generated from the OpenAPI spec.
- **TanStack Form**: compiler-friendly and validates through Standard Schema, but fewer people know it and its field arrays are more verbose.

## Decision
React Hook Form with `@hookform/resolvers/zod`. The base schemas are generated from OpenAPI and refined only where the UX needs it.

## Consequences
- Client and server validation share one contract, so they can't drift silently.
- Server `422` problem details map onto fields with `setError`.
- Under the React Compiler, use `useWatch`/`useFormState` rather than `watch()`, so subscriptions stay correct. CLAUDE.md records this rule.

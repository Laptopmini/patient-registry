# Architecture decision records

| ADR | Decision |
|-----|----------|
| [0001](0001-derive-last-visit-from-notes.md) | `last_visit` is computed from the newest note and never stored |
| [0002](0002-allergies-and-conditions-as-child-tables.md) | Allergies and conditions live in child tables |
| [0003](0003-soft-delete-patients.md) | Patients are soft-deleted (`archived_at`) |
| [0004](0004-offset-pagination.md) | Offset pagination with a total count |
| [0005](0005-react-aria-components-and-css-modules.md) | React Aria Components, CSS Modules and token variables |
| [0006](0006-tanstack-router.md) | TanStack Router with typed search params |
| [0007](0007-react-hook-form-with-zod.md) | React Hook Form with Zod |
| [0008](0008-biome-for-lint-and-format.md) | Biome for TypeScript, Ruff for Python |
| [0009](0009-flagd-feature-flag-provider.md) | OpenFeature with flagd |
| [0010](0010-caddy-serves-the-web-app.md) | Caddy serves the web app and proxies the API |

Template: Context, Options, Decision, Consequences. At most 25 lines.

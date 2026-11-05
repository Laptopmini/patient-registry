# Security

This page describes the security posture of Patient Registry v1: what it protects against, what was reviewed, and what it doesn't do. **v1 has no authentication and isn't ready for real patient data.** Treat it as a well-structured base, not a hardened system.

## Scope and data
- All data in the repository and the seed is **synthetic** (Faker, fixed seed). Emails use `example.com`, and phone numbers are in the fictional `555-01xx` range.
- The app stores protected health information (PHI): names, dates of birth, contact details, allergies, conditions and clinical notes. Every design choice below assumes that.

## Threat model (v1)
| Asset | Threat | Mitigation in v1 | Gap |
|---|---|---|---|
| Patient records | Unauthorised read or write | None at the application layer. The stack is meant for a trusted local network | **No authentication or authorisation** (see "Designed to grow" in the README) |
| Patient records | Lost updates from concurrent edits | Optimistic concurrency: `version` + `ETag`/`If-Match`; `PUT` without `If-Match` returns `428` | — |
| Patient records | Accidental deletion | Soft delete (`archived_at`, ADR 0003): archived records stay in the database and every endpoint answers `404` for them | No restore endpoint or audit trail yet |
| PHI in logs | Leaks through logs | Structured logs record only method, path, status, duration and request ID. Query strings, bodies and patient fields are never logged (a test enforces it). Uvicorn and Caddy access logs are off | — |
| PHI on client devices | Data left behind in browser storage | Unsaved edits stay in memory only (ADR 0012), and a test asserts that no Web Storage writes happen | Browser cache/history still hold rendered pages |
| PHI sent to a model provider | Third-party processing | The `anthropic` summary provider is off by default (flag + key). It receives note text and timestamps only, with no identifiers | Production use needs a business associate agreement (BAA) with the provider |
| Invalid input | Injection, invalid data | Pydantic validation on every field; SQLAlchemy bound parameters; LIKE wildcards escaped; sort fields allowlisted | No rate limiting |
| Web client | XSS, clickjacking | React escaping (no `dangerouslySetInnerHTML`); Caddy sends a strict CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` | CSP allows inline styles (`style-src 'unsafe-inline'`) |
| Error responses | Information disclosure | RFC 9457 problem details; unhandled errors return a generic 500 with no stack trace or message | — |
| Containers | Privilege escalation | API, web and flagd images run as non-root users; multi-stage builds ship no build tools | No image signing or vulnerability scanning in CI |
| Supply chain | Malicious or compromised dependencies | Lockfiles (`uv.lock`, `pnpm-lock.yaml`); install scripts are blocked except an allowlist (`pnpm` `allowBuilds`) | GitHub Actions are pinned to version tags, not commit SHAs; no Dependabot yet |

## What was reviewed
- The design review covered each item in the table above.
- Automated checks run in CI on every push:
  - linting, typecheck and the unit/API tests (including the no-PHI-in-logs and no-Web-Storage tests)
  - e2e tests with an accessibility scan
  - Lighthouse (including best practices)
- **No independent security audit or penetration test has been done.** A dedicated security review is on the backlog after v1.

## Known limitations
- No authentication, roles or tenancy: anyone who can reach the API can read and change every record.
- Local development credentials (`registry`/`registry`) are the defaults in `docker-compose.yml`. Compose doesn't publish the database port, but the credentials must be replaced outside local development.
- No TLS: Caddy serves plain HTTP on port 8080 for local use. Production needs TLS termination.
- The flagd evaluation endpoint is proxied at `/flagd` for the web provider. It exposes flag values (no PHI), which is acceptable for local use.
- There's no rate limiting, no audit log, and no automatic session timeout, because there are no sessions yet.

## Reporting a problem
Open a GitHub issue that describes the class of problem without posting a working exploit, or contact the maintainer through their GitHub profile.

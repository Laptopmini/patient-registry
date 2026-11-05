# Stage 4 brief: Frontend foundation (`frontend-engineer`)

Scope: `apps/web` (plus a `client` target in the root Makefile and one CI step). Don't touch `apps/api`. If the API looks wrong, write it under open questions instead.
Read first: `CLAUDE.md`, ADRs 0005–0007 and 0009–0011, `design/brief/02-user-flows.md`, `03-data-model.md` and `05-screens-and-states.md` (behaviour and states, **not** visuals), and `apps/api/openapi.json`.
**Styling in this stage stays minimal and neutral.** The real design arrives in Stage 5, so put effort into structure, behaviour, accessibility and tests, not looks.

## 1. Generated API layer (ADR 0011)
- Add `orval` (latest 8.x, pinned by the lockfile) with `apps/web/orval.config.ts`, which generates from `../api/openapi.json` into `src/api/generated/`:
  - A `react-query` client with `httpClient: 'fetch'` that uses a custom mutator `src/api/http.ts`.
  - A separate `zod` output for request and response schemas.
- `src/api/http.ts` (handwritten, unit-tested):
  - base URL `/api`
  - passes `AbortSignal` through, so TanStack Query cancels stale requests
  - parses `application/problem+json` into `class ApiError { status; problem; fieldErrors: Record<string, string> }`
  - turns `fetch` rejections (other than aborts) into `class NetworkError`
  - empty body on 204
- Scripts: `pnpm generate:api`, plus a root `make client` target. In `.github/workflows/ci.yml`, add a web-job step: `pnpm generate:api && git diff --exit-code src/api/generated` (the contract drift check).
- Biome already ignores `src/api/generated/**`. Never hand-edit it.

## 2. App structure
- Routes (TanStack Router file routes, `autoCodeSplitting`):
  - `__root` (the shell)
  - `/` (dashboard)
  - `/patients` (list)
  - `/patients/new`
  - `/patients/$patientId` (detail, with `tab` in the search params: `profile|notes|summary`)
  - `/patients/$patientId/edit`
  - a root `notFoundComponent`

  Every route validates its search params with Zod, and invalid values fall back to defaults. Loaders prefetch with `queryClient.ensureQueryData`.
- An unknown or archived patient (API 404) renders the same Not-found page, inside the shell.
- Every route has an `errorComponent`: a plain-language message and a **Retry** button that resets the query and invalidates the router.
- QueryClient defaults:
  - `staleTime` 30s
  - never retry 4xx `ApiError`s; retry network and 5xx errors up to 2 times
  - mutations use `networkMode: 'always'`, so failures surface right away with a retry option rather than pausing silently
- Shell:
  - a skip link
  - a header (app name linking to `/`, a **New patient** link, a placeholder slot for a user menu)
  - a sidebar nav (Dashboard, Patients; the active item marked by `aria-current`, not colour alone). On compact screens it becomes a drawer: React Aria `Modal`/`Dialog` opened by a menu button
  - a `<main>`
  - a toast region (React Aria Toast; check the current API in 1.22)
  - an **offline banner** (an `useOnlineStatus` hook on `navigator.onLine` and its events, plus a "Back online" notice)
- OpenFeature web: wrap the app in `OpenFeatureProvider`. If the flagd web provider can reach flagd through the same-origin `/flagd` path (check its options for a path prefix), use it. Otherwise fall back to the in-memory provider with the defaults from `flags/flags.json`, and note that in your report. No UI depends on flags yet.

## 3. Screens and behaviour (follow flows F1–F8 in `02-user-flows.md`)
- **Dashboard:**
  - count cards for total, active, follow-up and inactive, using `limit=1` list queries and reading `total`
  - "Recently seen" (`sort=-last_visit&limit=5`)
  - a quick search that navigates to `/patients?q=…`
- **Patient list (R-2.7–R-2.13):**
  - Search params: `q`, `status`, `sort` (the generated `SortField` enum), `page` (1-based; `offset = (page-1)*20`).
  - Search is **non-blocking**: the input is local state, and a debounce of about 250ms writes to the URL (`replace: true`). The query key comes from a `useDeferredValue` of the search params. Use `placeholderData: keepPreviousData` so results never blank out, and show a subtle "updating" indicator while `isPlaceholderData`. Stale requests are aborted through the signal.
  - At 768px and up, use a React Aria `Table` with sortable column headers (`sortDescriptor` ↔ URL `sort`). Below 768, use cards (React Aria `GridList` or a list of links) plus a "Sort by" `Select`. Choose with a `useMediaQuery` hook, and render only one of them.
  - A status filter (`Select` or `ToggleButtonGroup`), the result count ("42 patients", announced through a polite live region), pagination (`nav` with `aria-label`, previous/next and page numbers), and an empty state with "Clear search and filters".
  - Display: "Last, First"; age, with months under 2 years (computed from the date of birth); last visit as a localised date or "No visits"; status as text plus an icon or shape.
- **Patient detail:**
  - Header block: name, age with date of birth, status, blood type, and an **allergy strip** that is always visible (icon plus text, or "No known allergies").
  - **Edit** and **Archive patient** actions. Archive opens a confirmation `Dialog`, then sends `DELETE` with `If-Match`, navigates to the list and shows a toast.
  - React Aria `Tabs` bound to `tab`.
  - **Profile:** contact details, address, conditions. Phone display may use `libphonenumber-js/min`, loaded only in this route's chunk; otherwise show E.164.
  - **Notes (R-3.5):** list newest first, showing `recorded_at` prominently and "added …" when it differs; long notes truncate with "Show more".
    - The add form has a `DatePicker` with minute granularity (default now, in the local zone; not in the future), sends ISO with offset, and a `TextArea` (1–5,000, with a counter near the limit).
    - Adding is **optimistic** (`onMutate` with rollback). On success the form clears and focus returns to the textarea. On failure the text is kept, with an inline error and **Retry**.
    - Delete opens a confirmation `Dialog`, then removes the note optimistically and shows a toast.
  - **Summary (R-3.6):** a skeleton while loading. Show the identifiers, facts and narrative with paragraphs preserved, and the provenance label ("Generated from a template" / "AI-generated, verify before clinical use"), plus "Based on N notes".
- **Patient form (R-4.1–R-4.6), shared by new and edit:**
  - React Hook Form with `zodResolver`. Use the generated `PatientIn` Zod schema as the base, extended only for UX: empty strings become `null` for optional fields, a friendly E.164 hint, and a date of birth not in the future.
  - Fields:
    - personal: first and last name, date of birth (`DatePicker`), email, phone, address group
    - medical: blood type and status (`Select`), and allergies and conditions as a tag input (React Aria `TagGroup` with removable tags, plus a `TextField` that adds on Enter, rejecting case-insensitive duplicates)
  - Validate on blur and on submit. Use `useWatch`, never `watch()` (React Compiler).
  - On submit with errors: an **error summary** at the top lists every error as a link to its field and receives focus. Each field shows its inline error with `aria-invalid` and `aria-describedby`.
  - **Server 422:** map `errors[].field` (dotted, for example `address.city` or `allergies.1.name`) to `setError` on the matching fields, and also show them in the summary.
  - **PUT** sends `If-Match: "<version>"`. On **412**, show a conflict `Dialog` with "Reload their version" (refetch and reset) and "Overwrite with mine" (refetch the version, then resubmit).
  - **Network failure:** values stay put (never reset on error), a banner reads "Couldn't reach the server. Your changes are kept.", and there's a **Retry** button. Don't persist form data to browser storage, because it's patient data.
  - On success: invalidate the list and detail queries, navigate to the detail page, and show a toast.

## 4. Accessibility and performance baseline
- Every input has a visible label. Use one `h1` per route, move focus to the `h1` on route change, and label all landmarks.
- Global CSS:
  - `src/styles/tokens.css`: semantic placeholder tokens such as `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-danger`, `--color-focus`, `--space-*`, `--radius-*`, `--motion-duration-*`, for light and for dark (`prefers-color-scheme`). Stage 5 replaces the values.
  - `src/styles/base.css`: the focus ring on `[data-focus-visible]` and `:focus-visible`, at least 2px; interactive minimum size 44px; and `@media (prefers-reduced-motion: reduce)` turning off all transitions and animations.
- Components use CSS Modules, with no inline style objects for theming.
- Initial JS (entry chunk) under 150 kB gzip. Check with `vite build` and report the numbers.

## 5. Tests (Vitest, Testing Library, MSW 2 handlers built from the generated types)
- `src/test/` holds:
  - a `renderWithProviders` helper (QueryClient with retries off, a router with memory history, toast region)
  - MSW server setup with patient and note fixtures (use synthetic names from `design/brief/04-sample-data.json`, or Faker)
- **List:** rows render; typing updates the URL and sends `q` after the debounce; changing the sort updates the URL and the request; pagination; the empty state and clearing it; the error state and **Retry**.
- **Form:**
  - client validation messages and the error summary receives focus
  - a server 422 is mapped onto `address.city` and `phone`
  - a network failure keeps the values and Retry resubmits
  - a 412 opens the conflict dialog
  - create navigates to the new patient
- **Notes:** optimistic add; failure keeps the text with Retry; delete needs confirmation; the summary shows its provenance label.
- `http.ts` unit tests for problem+json parsing, NetworkError and abort.

## 6. Docker
`apps/web/Dockerfile` and `apps/web/docker/Caddyfile` already exist (Stage 3). Keep them working. `docker compose up --build --wait` followed by `./scripts/smoke.sh` must pass. If you add a build step (codegen runs before commit, so it shouldn't need one), update the Dockerfile.

## Done when
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass in `apps/web`.
- The generated client is committed, and `pnpm generate:api` produces no diff.
- The compose stack plus the smoke test pass.
- Update `docs/REQUIREMENTS.md` rows R-1.1–R-1.4, R-2.6–R-2.14, R-3.5, R-3.6, R-4.1–R-4.6, R-S.5 (status, Where, Test). Leave R-2.12 and R-2.14 `in progress` if they're only partly met before Stage 5.
- Small Conventional Commits with `web` scope (`ci:` for the workflow step), with no AI or co-author trailers.
- A report of 150 words or fewer, including bundle sizes and anything deferred.

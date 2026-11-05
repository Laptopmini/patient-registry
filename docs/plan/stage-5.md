# Stage 5 brief: Design implementation (`frontend-engineer`, two runs)

Scope: `apps/web` only (plus `.github/workflows/ci.yml` for the new lint step).
Read first: `CLAUDE.md`, then **`design/handoff/HANDOFF.md` in full** (it is the main spec, and its §8 "Engineering overrides" wins over the rest of it), then `tokens.css`, `components.md` and `motion.md`. The Stage 4 code is the foundation, so restyle and extend it rather than rewriting the behaviour that already works and is tested.
**The handoff files are visual references. Rebuild everything with React Aria Components and CSS Modules, and never copy markup or class names.**

The stage is split into two sequential runs, each with its own branch, review and merge. Do **only** the run you're told to do.

## Run 5a: foundation, primitives, list and detail
1. **Tokens and font.**
   - Copy `design/handoff/tokens.css` to `src/styles/tokens.css` **unchanged**, replacing the placeholder tokens. Re-point `base.css` and the existing modules at the semantic tokens.
   - Self-host Inter: `@fontsource-variable/inter` (current 5.x) → `public/fonts/InterVariable.woff2` through a small copy script that runs before `dev` and `build`; the font file can also be committed if that's simpler. Preload it in `index.html`.
   - No third-party requests at runtime.
2. **Token lint.** Add `stylelint` with `stylelint-declaration-strict-value`, so colour, spacing, radius, shadow, z-index and duration values in `*.module.css` must be `var(--…)`. Allow `0`, `inherit`, `currentColor`, `transparent`, `none` and `auto`. Add `pnpm lint:css` to the `lint` script, and to CI through `pnpm lint`.
3. **Shell** (HANDOFF §1–2, components §1):
   - container queries on the app shell (`@container app`, using the token breakpoints)
   - header, with the global "Find a patient" `ComboBox`, collapsed to an icon on `/patients`; options come from `list_patients` with `limit=8`
   - the wide sidebar, the medium rail with tooltips, and the compact drawer
   - the skip link, the offline banner (copy and states from components §1.4), and the toast region
   - a simple **Patient Registry** logo mark as an inline SVG drawn with tokens. **Never use any third-party or company logo.**
   - each route sets `document.title` to "<Page> · Patient Registry"
   - `scroll-padding` so focus is never hidden behind sticky elements
4. **Primitives:** one wrapper per React Aria component in `src/components/` with its own `.module.css`, following the HANDOFF §1 step 3 list. Custom ones: StatusBadge, CountPill, AllergyStrip, Skeleton, EmptyState, ErrorSummary, Pagination, OfflineBanner. Stepper waits for 5b. Use icons from `lucide-react`, imported one icon at a time. Add a **dev-only** `/__styleguide` route that doesn't exist in production builds: guard it with `import.meta.env.DEV` and keep it out of the prod route tree, or exclude its file from the build. It shows every state in `components.md`.
5. **Patient list** (HANDOFF §3.2): the toolbar per breakpoint, status toggles with counts (one `limit=1` query per status, all cached), the table or cards, pagination, the refetch bar, skeleton, empty, no-patients, and error states. Keep the Stage 4 debounce + deferred-value + `keepPreviousData` behaviour.
6. **Patient detail** (HANDOFF §3.3): breadcrumb, the header block, the allergy strip (including "No known allergies" and the compact pinned bar), tabs with a count pill, the Notes composer above the list, the snapshot column at wide sizes, 6-line clamping with "Show more", and the Summary provenance with a 72ch cap. Formatting follows HANDOFF §4: `Intl` formats, U+2212 in blood types, `libphonenumber-js/min` loaded only in the detail chunk, "added …" shown only when it falls on a different day.
7. **Dialogs:** delete note and archive patient (components §5.1). Initial focus goes to the safe action, and afterwards focus moves to a sensible target.

## Run 5b: forms, dashboard, 404, states and motion
1. **Create wizard** (HANDOFF §3.4): 4 steps in one RHF form, `?step=` in the URL (validated by Zod; jumping to a later step than the user has reached redirects to the first incomplete one), per-step validation with a focused step error summary, "Skip optional steps and review", the Review step with "Edit" links, the stepper (wide) and the "Step n of 4" ProgressBar (compact), a sticky footer, and the tips panel (`aside` on wide, `Disclosure` on compact).
2. **Edit page** (HANDOFF §3.5): single page; the error summary items read "**Label** – message"; the copy strings exactly as given; the conflict dialog says "Load their latest changes" / "Overwrite with mine"; offline behaviour per §3.5 **except the draft, which stays in memory only (ADR 0012)**.
3. **Unsaved-changes guard (ADR 0012):** when a dirty create or edit form is left, a TanStack Router `useBlocker` confirms with an in-app dialog, and `beforeunload` covers the browser. The guard turns off after a successful save. Add a test that saving writes nothing to `localStorage` or `sessionStorage`.
4. **Dashboard** (HANDOFF §3.1): the greeting by local time, the long date, the Find-a-patient combobox, the stat link cards, "Recently seen", and **no** chart placeholder.
5. **404** (HANDOFF §3.6): inside the shell, with a 96px inline SVG illustration and the exact copy.
6. **States sweep:** every screen has loading, empty, error and offline states. Read-only screens offline show the "Showing data from HH:MM" badge, and actions that need the network are disabled with an explanation.
7. **Motion** (all of `motion.md`):
   - View Transitions on route changes and list updates
   - React Aria `[data-entering]`/`[data-exiting]` animations
   - only `opacity`/`transform`, everything under `@media (prefers-reduced-motion: no-preference)`
   - a JS guard before `startViewTransition`

## Verification (both runs)
- `pnpm lint` (Biome and stylelint), `pnpm typecheck`, `pnpm test` and `pnpm build` all pass. Keep or adapt the existing tests, and add component tests for the new primitives' key states, the wizard (step validation, skip, review edit links, create) and the unsaved-changes guard.
- **Visual comparison.**
  1. Run the Compose stack (use `COMPOSE_PROJECT_NAME=pr-stage5 WEB_PORT=8083 API_PORT=8003`).
  2. Add `apps/web/e2e/visual.capture.ts`, a Playwright script (not a CI test yet), that captures each screen you built at 360, 768 and 1280 in light and dark (`colorScheme`), with `page.clock.setFixedTime('2026-11-05T13:10:00-08:00')` and `timezoneId: 'America/Los_Angeles'`. Write the captures to `apps/web/test-results/visual/`, which is git-ignored.
  3. **Look at your capture and the matching `design/handoff/screens/` reference side by side** (read both images). Fix layout, spacing, type, colour and copy differences.
  4. Data won't match exactly (the seed isn't the sample file), so judge structure and styling, not names.
  5. List the remaining differences in your report.
- Accessibility smoke: run `@axe-core/playwright` on each captured page in the same script and fix every violation. Stage 6 turns this into CI tests.
- Bundle: the entry chunk stays at or under 150 kB gzip. Report the numbers. Inter and Lucide must not bloat the entry chunk.
- Update `docs/REQUIREMENTS.md` (R-2.6, R-2.12, R-2.14 and anything else that changed). Commit in small Conventional Commits with `web` scope (`ci:` for the workflow), with no AI or co-author trailers. The report is 150 words or fewer.

## Run 5b additions (from the 5a review)
- **Dates:** the `DatePicker`/`DateField` shows "5 Nov 2026", not "05 / 11 / 2026". Display dates must read "27 Sep 1947" in every engine, so build them from `formatToParts` with explicit `day`/`month: 'short'`/`year`. Chrome's en-GB gives "Sept", which is wrong here.
- **Relative "added …":** never phrase it in the future. A `created_at` after "now" (clock skew, frozen test clocks) reads "just now".
- **Sidebar:** fills the viewport height at every size (it currently stops at about 900px in full-page captures).
- **Header block spacing:** match the reference (breadcrumb → h1 → facts → allergy strip is tighter than now).
- **`ErrorSummary`:** the form switches to the new primitive.
- **Styleguide:** no horizontal scroll at 360px.
- **Bundle:** "entry chunk" means the JS needed for first paint (the entry plus its static imports). Lazy-loading non-critical shell extras is the right approach. Keep it at or under 150 kB gzip.

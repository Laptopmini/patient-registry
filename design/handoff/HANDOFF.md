# Patient Registry · Design handoff

**To: the Claude Code session building Patient Registry**
**From: design · approved 5 Nov 2026 · Direction "Lavender Clinical"**

You are implementing the Patient Registry web app from this design package. Read this whole file first, then `tokens.css`, `components.md` and `motion.md`. The screens in `screens/` show what "done" looks like.

> **Important: these files are visual references. Rebuild every screen with React Aria Components and CSS Modules, and never copy markup or class names.** The PNGs were rendered from design mock-ups whose markup isn't production code: it uses placeholder `div`s with ARIA roles, inline styles and non-RAC controls. Match the result, not the source.

## 0. What's in this folder

```
handoff/
├── HANDOFF.md      ← this prompt
├── tokens.css      ← drop into src/styles/tokens.css unchanged. The only source of design values.
├── components.md   ← every component: RAC mapping, anatomy, tokens, all states, touch targets
├── motion.md       ← every animation: trigger, property, duration, easing, reduced motion
└── screens/        ← 70 PNG references, <screen>-<breakpoint>-<theme>.png
```

The brief (`01-product.md` … `07-return-package.md` and `04-sample-data.json`) still applies. Where this package differs from the brief, **this package wins**. See §5.

## 1. Order of work

Work in this order. Don't start a step until the one before it passes its checks.

1. **Tokens.**
   - Import `tokens.css` once at the root. Self-host Inter: copy `inter-latin-wght-normal.woff2` from `@fontsource-variable/inter` to `public/fonts/InterVariable.woff2` and preload it.
   - Add a lint rule (stylelint `declaration-strict-value` or similar) so colours, spacing, radii, shadows, z-index and durations in CSS Modules **must** be `var(--…)`.
   - Put `container-type: inline-size; container-name: app` on the app shell. Responsive rules use `@container app (…)` with the numbers in tokens.css. That's why layouts hold at 200% zoom.
2. **Shell.** Header, sidebar / rail / drawer, skip link, `<main id="main">`, toast region, offline banner slot, and routing with View Transitions (`motion.md` #1). Use landmarks: `header`, `nav[aria-label="Main"]`, `main`. Give every page a single h1 and a `<title>` ("Ana Terry · Patient Registry").
3. **Primitives.** Wrap each RAC component once in `src/components/` with its own `.module.css`: Button, Link, TextField, SearchField, ComboBox, Select, DatePicker, TimeField, RadioGroup, TagInput, ToggleButtonGroup, Table, GridList, Tabs, Dialog, Popover, Menu, Tooltip, Toast, Disclosure, ProgressBar, plus the custom StatusBadge, CountPill, AllergyStrip, Skeleton, EmptyState, ErrorSummary, Stepper, Pagination and OfflineBanner. Build a quick `/__styleguide` route (dev only) that shows every state from `components.md`. Use it to check states before building screens.
4. **Screens**, in the order of the user flows:
   - Patient list (F1)
   - Patient detail: Notes, Profile, Summary (F2–F4)
   - Create patient wizard (F5)
   - Edit (F6)
   - Dashboard
   - 404 (F8)
5. **States.**
   - Every screen: loading (skeletons), empty, error and offline (F7).
   - Components: refetching, submitting/pending, validation (client and server), conflict, toasts.
6. **Motion.** Last, per `motion.md`. Every animation is behind `prefers-reduced-motion: no-preference`.

## 2. Global layout rules

| | Compact 360–767 | Medium 768–1279 | Wide ≥1280 |
|---|---|---|---|
| Navigation | Drawer (`Modal`), menu button in the header | 72px icon rail, labels in `Tooltip` | 248px sidebar with labels |
| Header | menu · logo · search icon · New patient icon (44px) | logo · search icon · New patient · user slot | logo · 340px search ComboBox · New patient · user slot |
| Main padding | 16px | 24px | 24px top, 40px sides, 48px bottom |
| Main max width | fluid | fluid | 1192px (app ≈ 1440px with the sidebar) |
| Vertical rhythm in main | 16px gap | 24px gap | 24px gap |
| Patient list | Cards (`GridList`) | Table, 12px cell padding | Table |
| Snapshot / tips column | hidden | hidden | 300px, 32px gutter |

- Nothing may scroll horizontally at 360px. Long names wrap (`overflow-wrap: anywhere`) and are never truncated in headers. Test with "Vanderbilt-Okonkwo-Hargreaves, Maximiliana-Josephine".
- Density is "comfortable". Controls are 44px, table rows at least 52px, and card padding 16–24px.
- `html { scroll-padding-top: calc(var(--size-header) + 16px); }`, plus `scroll-padding-bottom` where a sticky footer is shown, so focused elements are never hidden (WCAG 2.4.11).

## 3. Per-screen notes

Reference files: `screens/<name>-{360,768,1280}-{light,dark}.png`.

### 3.1 Dashboard `/` (`dashboard-*`)
- h1 "Good afternoon" (morning before 12:00, evening from 18:00, local time). Below it, the date in long form: "Thursday, 5 November 2026".
- "Find a patient" ComboBox, max 560px wide, 52px tall.
- "Patients by status": 4 stat link cards (4 columns at wide and medium, 2×2 at compact). They link to `/patients?status=…`, and "Total" links to `/patients`.
- Two columns at wide and medium (3fr / 2fr): "Recently seen" (the 5 patients with the newest `last_visit`, from `GET /patients?sort=-last_visit&limit=5`) and the **reserved chart slot**. In v1 the chart slot renders **nothing**: don't ship the dashed placeholder from the reference. At compact it's one column.

### 3.2 Patient list `/patients` (`patient-list-*`, `patient-list-loading|empty|error-*`)
- **Toolbar:**
  - **Wide:** SearchField (360px) and the status ToggleButtonGroup with counts, in one row, with the result count ("20 patients", `role="status"`) at the end.
  - **Medium:** the search takes a full row, then the filter row.
  - **Compact:** search, then a 2-column grid of Status Select and Sort-by Select, then the count.
- **URL is the source of truth:** `?q=&status=&sort=&page=`. Search is debounced by 250ms and uses `startTransition`, so typing never blocks. While a request is in flight, keep the old results and show the refetch bar (`motion.md` #13).
- **Table:**
  - Columns Name 40%, Age 19%, Last visit 19%, Status, and Actions 68px.
  - The default sort is `last_name` ascending, with `aria-sort` on the sorted column.
  - **Reference states:** the 1280 reference shows page 2 of 2 at **10 per page, for illustration only**. The real default is 20 per page. Row 3 shows the hover state.
- **Pagination:** the footer closes the table card.
- **States:**
  - Loading: 10 skeleton rows or 5 skeleton cards, at final heights.
  - Empty: names the query and offers "Clear search and filters".
  - No patients at all: "No patients yet" with "Add the first patient".
  - Error: Retry, and the toolbar keeps working.

### 3.3 Patient detail `/patients/:id`, `/notes`, `/summary` (`patient-detail-profile|notes|summary-*`)
- Breadcrumb "Patients › Ana Terry".
- **Header block:** h1 (name, 28px/24px compact), status badge, then a definition list: Age, Born, Blood type. Edit (link) and Archive patient (danger outline, opens the dialog) sit at the end. At compact they're a 2-column grid under the facts.
- **Allergy strip:** always directly under the header block and above the tabs, on every tab (`components.md` §4.3, including the "No known allergies" variant and the compact pinned bar).
- **Tabs:** Profile / Notes (count pill) / Summary. Each tab is its own route (`Tab href`). The default route `/patients/:id` shows Profile.
- **Notes (wide):** a grid of minmax(0,1fr) and a 300px snapshot column, with a 32px gap. The composer card sits above the list, intentionally: it's the main clinician action.
- **Summary:** shows its provenance from `provider`.
  - `anthropic`: the AI label (reference shown).
  - `template`: the template label (`patient-detail-summary-empty-*` also shows the no-notes state, for Danielle Bowman).
  - The narrative is capped at 72ch.
- **Archived or missing id:** render the 404 page.
- The Profile reference also shows the success toast ("Changes saved") in its resting position.

### 3.4 Create patient `/patients/new` (`patient-form-*` = step 1, `patient-form-review-*` = step 4)
- **This is a 4-step wizard**, changed from the brief's single form in design review: (1) Patient details (required), (2) Address (optional), (3) Medical (optional), (4) Review.
- **Behaviour:**
  - Keep all wizard state in one form state object. Moving between steps never loses data.
  - Store the step in the URL (`?step=2`) so Back and Forward work.
  - Validate the current step on Continue: field errors plus the step's own error summary, with focus moved to it.
  - "Skip optional steps and review" appears on step 1 only.
  - Review shows each section with an "Edit" link back to that step, then **Create patient**. On success, navigate to `/patients/:newId` and show the toast "Patient created".
- **Wide layout:** max 1100px, form column plus a 300px tips `aside`. The stepper is a 4-column grid with a 3px top bar.
- **Compact:** "Step n of 4" with a `ProgressBar`, tips in a collapsed `Disclosure`, and a sticky footer (Back | Continue, with "Skip…" across the full width above them).
- Status defaults to Active, blood type to Unknown and country to US.

### 3.5 Edit patient `/patients/:id/edit` (`patient-form-errors-*`, `offline-banner-*`, `dialog-conflict-*`)
- **Single page**, not a wizard, so a quick fix stays quick. Fieldsets "Personal" (with a nested "Address (optional)" group) and "Medical". Max width 860px.
- Fields are required unless they say "(optional)". The note at the top reads "All fields are required unless marked optional."
- **Validation:**
  - Fields validate on blur and again on submit.
  - On submit with errors, the error summary at the top **receives focus** (shown with its focus ring in the reference).
  - **Each summary item starts with the field's exact label in bold** ("**Email** – …"). This lets people match each item to its field.
  - Server `errors[]` render the same way.
- **Copy:**
  - Phone: "Enter a phone number in international format, e.g. +1 212 555 0100"
  - Email: "Enter an email address with a domain, e.g. name@example.com"
- **Compact:** Cancel and Save are a sticky 2-column footer.
- **Offline (F7):**
  - The form stays filled and the banner appears under the header.
  - Save stays enabled. Pressing it while offline shows the banner's Retry state instead of an error.
  - Keep the unsaved edits in memory (form state) so nothing typed is lost; see §8.
- **Conflict (version mismatch):** the dialog offers **Load their latest changes** (primary) and "Overwrite with mine". Design review changed the brief's "Reload their version" wording.

### 3.6 404 (`not-found-*`)
- Inside the shell, with no nav item marked current. Centred, with a 96px inline SVG illustration (tokens only, `aria-hidden`).
- h1 "We couldn't find that page", the sentence "The link may be out of date, or the patient record may have been archived.", then **Go to patients** (primary) and **Dashboard** (secondary).

### 3.7 Dialogs (`dialog-delete-note|archive-patient|conflict-*`)
- See `components.md` §5.1. Destructive confirm buttons are danger-solid. Initial focus goes to the safe action. Afterwards, focus moves to a sensible target (the next note, or the list) and the outcome toast shows.

## 4. Data and formatting rules

- Use `04-sample-data.json` for fixtures and Storybook. All of it is synthetic. Display rules:
  - Names: "Last, First" in lists, "First Last" in headers.
  - Dates: "27 Sep 1947". Clinical date-time: "13 Jul 2026, 23:30" in the user's time zone (`Intl.DateTimeFormat`).
  - Ages: "78 y", or "18 mo" under 2 years.
  - Phone: E.164 → "+1 415-555-0155" (use `libphonenumber-js/min`).
  - Blood type: "AB−" (U+2212), and "Unknown".
  - No last visit: "No visits".
  - "added 4 months ago" (`Intl.RelativeTimeFormat`) shows only when `created_at` falls on a different calendar day from `recorded_at`.
- The references are rendered for **America/Los_Angeles** with "now" = 5 Nov 2026, 13:10. Many sample note times land between 1 and 4 am in that zone. That's correct for the data, not a bug in the formatting.
- **Stress tests to cover in Storybook and Playwright:**
  - The long-name patient (12).
  - Patients with no notes (Danielle Bowman, Jessica Wall), no allergies (David Maldonado) and no conditions (Gina Anderson).
  - 3 allergies and 3 conditions (Ana Terry).
  - A pediatric patient (Brittney Love, "5 y").
  - A 5,000-character note: clamp to 6 lines with "Show more". Build the fixture by joining that patient's own note bodies.

## 5. Decisions made in design review (these override the brief)

1. **Visual direction:** lavender-violet accent, cool neutral ink, Inter variable. Replace the placeholder "≻" logo mark with a simple Patient Registry mark (inline SVG, tokens only).
2. **Patient detail:** tabs at every size, plus a clinical snapshot column at ≥1280 on the Notes and Summary tabs.
3. **Density:** comfortable.
4. **Create patient:** a 4-step wizard with a tips panel. Edit stays a single page.
5. **Count pills** replace "(3)": Allergies, Conditions and the Notes tab.
6. **Conflict dialog** primary button: "Load their latest changes".
7. **Error summary items:** the field label in bold, then " – " and the message.
8. **Add-note composer** is always visible above the notes list, not hidden behind a button.
9. **Header search** on `/patients` collapses to an icon, because the list has its own search.

## 6. Acceptance checks

All of these must pass before you call the build done.

1. **Visual match.** Every screen matches its reference at **360, 768 and 1280** in **light and dark** (the dark theme via `prefers-color-scheme: dark`, and also via `<html data-theme="dark">`). Use Playwright screenshot tests with the sample data frozen at 5 Nov 2026 13:10 America/Los_Angeles (`page.clock.setFixedTime`, `timezoneId`). Small anti-aliasing differences are fine. Layout, spacing, type, colour and copy must match.
2. **Accessibility.**
   - **axe finds no violations** (`@axe-core/playwright`) on every screen and state, in both themes and at all three widths.
   - Manual keyboard pass:
     - Every action is reachable with Tab, Shift+Tab, arrows, Enter, Space and Escape.
     - Focus is always visible (2px ring) and never hidden under sticky elements.
     - Dialogs trap focus and restore it when they close.
     - The error summary takes focus on submit.
   - Contrast: the token pairs are listed with their ratios in `tokens.css`. Don't introduce new pairs without checking them.
   - Every interactive target is at least 44×44px.
   - Status, errors, allergies and the active nav item never rely on colour alone.
   - Text works at 200% zoom and with the WCAG 1.4.12 spacing overrides: no clipping and no horizontal scroll at 360 CSS px.
3. **Performance.** Lighthouse scores **95 or higher in every category** (mobile and desktop):
   - One self-hosted WOFF2 font, preloaded, with `font-display: swap`.
   - No third-party requests.
   - No motion library.
   - Icons are tree-shaken.
   - CLS stays below 0.05, because skeletons match final sizes.
4. **Reduced motion.** With `prefers-reduced-motion: reduce` emulated, **nothing animates**: no transitions, keyframes, View Transitions or spinners. A Playwright test should assert that `getAnimations()` is empty after each interaction.
5. **Flows.** F1–F8 pass as end-to-end tests, including:
   - URL state round-trip on the list.
   - Optimistic note insert, plus the failure-and-retry path.
   - Delete with confirmation.
   - Wizard create.
   - Edit with client and server errors.
   - The 412 conflict (version mismatch), both choices.
   - Offline save and recovery.
   - 404 for an unknown id and for an archived id.

## 7. Screen index

| Reference | Built from |
|---|---|
| `dashboard-*` | `/` |
| `patient-list-*` | `/patients?page=2` (10 per page, illustration only) |
| `patient-list-loading-*`, `-empty-*` (`?q=smi`), `-error-*` | `/patients` states |
| `patient-detail-profile-*` | `/patients/:id` (Ana Terry), with the "Changes saved" toast |
| `patient-detail-notes-*` | `/patients/:id/notes` (Ana Terry) |
| `patient-detail-summary-*` | `/patients/:id/summary` (Ana Terry, AI provenance) |
| `patient-detail-summary-empty-*` | `/patients/:id/summary` (Danielle Bowman, template, no notes) |
| `patient-form-*` | `/patients/new`, step 1 |
| `patient-form-review-*` | `/patients/new?step=4` (Jessica Wall's sample values) |
| `patient-form-errors-*` | `/patients/:id/edit` with invalid email and phone, after submit |
| `offline-banner-*` | `/patients/:id/edit` while offline |
| `not-found-*` | an unknown route |
| `dialog-delete-note-*`, `dialog-archive-patient-*`, `dialog-conflict-*` | the confirm dialogs over their pages |

## 8. Engineering overrides (applied after design approval)

- **Unsaved edits are kept in memory only, never in browser storage** ([ADR 0012](../../docs/decisions/0012-unsaved-edits-in-memory-only.md)). They survive network failures and offline saves, but not a reload.
- **Edit conflicts are `412 Precondition Failed`** (optimistic concurrency with `If-Match`), not 409.
- **There's no Storybook.** The dev-only `/__styleguide` route covers the component states, and Playwright covers the stress-test fixtures.

**Final reminder: these files are visual references. Rebuild every screen with React Aria Components and CSS Modules, and never copy markup or class names.**

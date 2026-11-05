# Component inventory

Patient Registry · Direction B "Lavender Clinical" · approved 5 Nov 2026

Every component is built with **React Aria Components (RAC)** and styled with **CSS Modules**, using only tokens from `tokens.css`. State styling hangs off RAC's data attributes. Where nothing in RAC fits, the entry says **custom** and names the RAC parts it is composed from.

## Conventions for every component

| State | Selector | Treatment, unless the entry says otherwise |
|---|---|---|
| default | none | as described |
| hover | `[data-hovered]` | Background or border change only. Colour changes are **instant** (no transition). |
| pressed | `[data-pressed]` | Same as hover, plus `filter: brightness(0.95)` on filled buttons. No scale. |
| focus-visible | `[data-focus-visible]` | `outline: var(--focus-ring); outline-offset: var(--focus-ring-offset)`. Never hidden behind sticky header or footer (use `scroll-padding`, see tokens.css). |
| selected | `[data-selected]` | Never colour alone: add weight, a shape (bar, border, filled pill) or an icon. |
| disabled | `[data-disabled]` | `--color-text-disabled` text, border unchanged, `cursor: not-allowed`. Keep it focusable only where RAC does (for example `isDisabled` with a tooltip explanation). Prefer explaining over disabling. |
| invalid | `[data-invalid]` | 2px `--color-danger-border`, `--color-danger-bg` fill, plus a `FieldError` with an icon and text. |
| pending | `[data-pending]` | Button keeps its width, label becomes "Saving…", spinner icon (see motion.md), `aria-disabled`. The form stays editable. |

- **Touch targets:** every interactive element has a hit area of at least `--size-touch` (44×44). Visually smaller items (tag remove ×, the 36px segmented buttons) extend their hit area with padding or negative margin.
- **Icons:** Lucide (ISC licence), imported per icon as inline SVG React components (`lucide-react`, tree-shaken). No icon fonts. Stroke width 2 (2.2 in badges). Decorative icons get `aria-hidden="true"`. Icon-only buttons have an `aria-label`.
- **Numbers:** dates, ages, counts, times and phone numbers use `font-variant-numeric: tabular-nums`.
- **Formatting:** names are "Last, First" in lists and "First Last" in headers. Dates use the localised medium format ("26 Mar 1958"). Date-times read "13 Jul 2026, 23:30". Ages read "68 y", or "18 mo" under 2 years. Phones are E.164 formatted ("+1 415-555-0126"). Blood type uses U+2212 ("AB−"), and `unknown` shows as "Unknown".

---

## 1. App shell

### 1.1 Header (custom layout)
- **RAC parts:** `Link` (logo → `/`), `ComboBox` (global search), `Link` styled as a primary button (New patient → `/patients/new`), and an empty slot for a future user `MenuTrigger`.
- **Anatomy:**
  - Height `--size-header`. Background `--color-bg`, with a 1px `--color-border` bottom edge.
  - Logo: the Patient Registry mark (a simple inline SVG built from tokens, replacing the placeholder "≻") plus "Patient Registry" at 17px, weight 650, `--tracking-snug`.
  - Wide: global search ComboBox, 340px.
  - User-menu slot: 36px. In v1 it renders nothing, but the space is reserved.
- **Responsive:**
  - **Wide:** full search field. On `/patients`, the header search collapses to an icon button because the list has its own search.
  - **Medium:** search becomes an icon button that opens the ComboBox in a `Popover`.
  - **Compact:** menu button (opens the drawer), logo, search icon, and New patient as a 44px icon button with `aria-label="New patient"`. The user slot is hidden.
- **States:** links and buttons follow the conventions. Search: see 3.2.

### 1.2 Sidebar / rail / drawer (custom)
- **RAC parts:** `Link` items in a `<nav aria-label="Main">`. At medium, each item is wrapped in `TooltipTrigger` + `Tooltip`. At compact, `Modal` + `Dialog` form the drawer, opened by a `Button`.
- **Anatomy:**
  - Width `--size-sidebar` (wide), `--size-rail` (medium) or `--size-drawer` (compact).
  - Background `--color-sidebar`, with a 1px `--color-border` right edge.
  - Items are 44px tall with `--radius-md`, a 20px icon, and a 15px/500 label.
  - Leave space below for future sections, with no placeholder items.
- **States:**
  - hover: `--color-nav-hover-bg`.
  - **current page:** `aria-current="page"` plus a filled `--color-nav-selected-bg` pill, `--color-nav-selected-fg` text, weight 650, and a 6px dot at the end (wide). At medium, the filled pill alone carries it.
  - On detail and form pages, "Patients" stays current (`aria-current="true"`).
- **Medium rail:** labels are visually hidden but still available to assistive tech. The tooltip shows the label on hover and focus.
- **Compact drawer:** slides from the start edge. The scrim closes it, Escape closes it, and focus is trapped then restored (RAC Modal).

### 1.3 Skip link (custom)
`<a href="#main">Skip to main content</a>` is the first focusable element. It sits off-screen until focused, then appears top-left at `--z-skip-link` in primary colours.

### 1.4 Offline banner (custom)
- **RAC parts:** a `<div role="status">` live region and a `Button` (Retry).
- **Anatomy:**
  - Full-width bar under the header, at least 52px tall.
  - `--color-banner-bg`, `--color-banner-fg` text, 1px `--color-banner-border` bottom edge.
  - wifi-off icon. Copy: "You appear to be offline. Your changes are kept."
  - Retry: a 36px-tall button inside a 44px hit area, with a surface background.
- **States:**
  - **offline:** shown.
  - **back online:** the text changes to "Back online" (check icon), stays for 4s, then is removed.
  - Retry follows the button states. While retrying it is `[data-pending]`.
- **Read-only screens offline:** show the last loaded data with a "Showing data from 13:02" badge (info colours, clock icon) next to the h1. Actions that need the network are disabled, with a tooltip explaining "Not available offline".

### 1.5 Toast region
- **RAC parts:** `UNSTABLE_ToastRegion`, `UNSTABLE_Toast`, `UNSTABLE_ToastQueue`. **Pin the RAC version**, because the API is marked unstable.
- **Anatomy:**
  - Width `--size-toast`. Bottom-right, 24px from the edges (wide and medium). Compact: full width with 16px inset.
  - `--color-toast-bg` and `--color-toast-fg`, `--radius-lg`, `--shadow-toast`.
  - Icon (circle-check for success, circle-alert for failure), message, and a 44px dismiss button.
- **Behaviour:** `role="status"` for success and `role="alert"` for failure. Auto-dismiss after `--toast-timeout`, paused on hover or focus. Failure toasts don't auto-dismiss. At most 3 are stacked.
- **Messages:** "Patient created", "Changes saved", "Note deleted", "Patient archived", "We couldn't delete the note. Try again."

---

## 2. Buttons and links

### 2.1 Button
- **RAC parts:** `Button`, or `Link` when it navigates (New patient, Edit, Cancel).
- **Size:** height `--size-control` (44), horizontal padding 16, gap 8, 18px icon (`flex: none`), 15px/600 text, `--radius-md`. The small variant (`--size-control-sm`, 36) is used only inside a 44px row.

| Variant | Default | Hover / pressed | Use |
|---|---|---|---|
| **primary** | `--color-primary-bg`, `--color-primary-fg` | `filter: brightness(1.1)` / `0.95` | One per view: New patient, Add note, Continue, Create patient, Save changes, Load their latest changes |
| **secondary** | `--color-surface`, 1px `--color-border-strong`, `--color-text` | `--color-nav-hover-bg` | Edit, Cancel, Back, Regenerate, Add (tag), Overwrite with mine |
| **danger (outline)** | `--color-surface`, 1px `--color-border-strong`, `--color-danger-fg` | bg `--color-danger-bg`, border `--color-danger-border` | Archive patient (opens the confirm dialog) |
| **danger (solid)** | `--color-danger-solid-bg`, `--color-danger-solid-fg` | brightness | Confirm button inside a destructive dialog only |
| **quiet icon** | transparent, `--color-text-muted`, 44×44 | `--color-nav-hover-bg`; the delete icon turns `--color-danger-fg` | Row "⋯", delete note, dismiss |
| **text link button** | transparent, `--color-link`, underlined | underline thickness 2px | "Skip optional steps and review" |

- **focus-visible:** the standard ring.
- **disabled:** see conventions. The Next page button uses `isDisabled`.
- **pending:** see conventions.

### 2.2 Link
- **RAC parts:** `Link`.
- `--color-link`, always underlined (`text-underline-offset: 3px`). Hover thickens the underline to 2px. Breadcrumb links and inline links have a 44px-tall hit area.

### 2.3 Breadcrumbs
- **RAC parts:** `Breadcrumbs`, `Breadcrumb`, `Link`.
- 14px text. Chevron-right separators are `aria-hidden`. The current item is `--color-text` with `aria-current="page"`.
- Shown on detail and form pages at every size.

---

## 3. Inputs

### 3.1 TextField / TextArea
- **RAC parts:** `TextField`, `Label`, `Input` or `TextArea`, `Text slot="description"`, `FieldError`.
- **Anatomy:**
  - Label: 14px/600 `--color-text`, with "(optional)" in `--color-text-muted`/400.
  - Input: 44px tall, padding 0 12, 1px `--color-border-strong`, `--radius-md`, `--color-surface`.
  - Description: 13px `--color-text-muted`.
  - TextArea: minimum 112px tall, vertical resize, line-height 1.55.
- **States:**
  - hover: border `--color-text-muted`.
  - focus-visible: the standard ring (outline, not a border change).
  - **invalid:** 2px `--color-danger-border` (padding reduced by 1px so the text doesn't move), `--color-danger-bg`. `FieldError` below shows a circle-alert icon and 14px/500 `--color-danger-fg` text, linked with `aria-describedby`.
  - disabled: `--color-surface-subtle` background, disabled text.
- **Note text counter:** hidden until 4,500 characters. Then it shows "4,612 / 5,000" in muted text, and from 4,900 in `--color-danger-fg` with `aria-live="polite"`. Over the limit is blocked by `maxLength`.

### 3.2 SearchField (list search) and ComboBox (global "Find a patient")
- **RAC parts:** `SearchField` (list), `ComboBox` with `Popover` + `ListBox` (header and dashboard).
- **Anatomy:**
  - 44px tall (52px on the dashboard), search icon at the start, and a clear button (44px hit area) once there's text.
  - Placeholder "Name, email or phone". The visible label is always present ("Search patients" or "Find a patient").
  - ComboBox options show "Last, First" with "68 y · 26 Mar 1958" on a muted second line and a status badge. Enter opens the patient.
- **States:**
  - **refetching:** a 2px indeterminate `ProgressBar` along the top edge of the results header ("Updating results" for screen readers). The previous results stay visible, with no blank flash.
  - Debounce 250ms. Typing never blocks.
  - Empty ComboBox: "No patients match 'smi'".

### 3.3 Select
- **RAC parts:** `Select`, `Label`, `Button`, `SelectValue`, `Popover`, `ListBox`, `ListBoxItem`.
- **Anatomy:** a 44px trigger with a chevron-down. Options are 44px tall, and the selected option has a check icon plus weight 600.
- **Used for:** country, blood type, the compact status filter and the compact "Sort by".
- **States:** as for TextField, plus `[data-open]` on the trigger, which gets the focus ring while open.

### 3.4 DatePicker / DateField and TimeField
- **RAC parts:** `DatePicker` (`Group`, `DateInput`, `DateSegment`, `Button` → `Popover` + `Dialog` + `Calendar`) and `TimeField` (`hourCycle={24}`).
- **Anatomy:** 44px tall. Segments show the medium date ("5 Nov 2026"), and the calendar button is 36px inside the field.
- **Validation:**
  - Clinical date and time: `maxValue` = now. Date of birth: `maxValue` = today, `minValue` = today − 130 years.
  - Errors: "The clinical time can't be in the future." and "Enter a date of birth in the past 130 years."
- **States:** a focused segment uses `--color-info-bg` with `--color-info-fg`. Placeholder segments are muted ("dd / mmm / yyyy").

### 3.5 Status radio cards
- **RAC parts:** `RadioGroup`, `Radio`. (Not in the brief's list, but part of RAC.)
- **Anatomy:**
  - A grid of three cards (one column at compact), each at least 52px tall.
  - Each card: 1px `--color-border-strong`, `--radius-md`, a 20px radio ring, the status icon in its icon colour, and a 15px/600 label.
- **States:**
  - selected: 2px `--color-accent` border, `--color-info-bg`, and a filled 10px dot in the ring.
  - hover: background `--color-surface-hover`.
  - focus-visible: the ring around the card.

### 3.6 Tag input (custom: allergies and conditions)
- **RAC parts:** `TextField` + `Button` ("Add") + `TagGroup` / `TagList` / `Tag`, with a `Button slot="remove"` per tag. Suggestions are optional and would use a `ComboBox` instead of the TextField.
- **Behaviour:**
  - Enter or "Add" adds the trimmed value and clears the field. Focus stays in the field.
  - A duplicate (case-insensitive) shows the FieldError "Peanuts is already in the list".
  - Limits: 1–100 characters per item, at most 50 items.
  - Removing a tag moves focus to the next tag, or to the input if none are left.
- **Tag anatomy:**
  - 36px tall, pill-shaped, 14px/600 text, and a remove button with a 44×44 hit area overlapping the tag's end.
  - **Allergy tags:** `--color-allergy-bg` fill, `--color-allergy-border` edge and `--color-allergy-fg` text.
  - **Condition tags:** `--color-surface-subtle` fill and a `--color-border-strong` edge.
- **States:** tag hover darkens the border. Tag focus-visible shows the ring. Remove hover is a circle in `--color-nav-hover-bg`.

### 3.7 Status filter (wide and medium)
- **RAC parts:** `ToggleButtonGroup` (`selectionMode="single"`, `disallowEmptySelection`) with `ToggleButton`. (Not in the brief's list, but part of RAC.)
- **Anatomy:**
  - Track `--color-seg-track`, `--radius-seg`, 4px padding.
  - Buttons are 36px tall inside the 44px track. Each shows its label and a count ("Active 13").
- **States:**
  - **selected:** `--color-seg-selected-bg`, `--color-seg-selected-fg`, a 1.5px `--color-seg-selected-border` border and weight 650.
  - hover: text `--color-text`.
  - focus-visible: the ring.
- **Compact:** replaced by a `Select` labelled "Status".

---

## 4. Data display

### 4.1 Status badge (custom)
- **Markup:** a `<span>` with an icon and text. It isn't interactive.
- **Anatomy:** 28px tall, pill-shaped, padding 0 10 0 8, 13px/600 text, 16px icon.

| Status | Icon | Tokens |
|---|---|---|
| Active | `circle-check` | `--color-status-active-bg` / `-fg` / `-icon` |
| Follow-up | `clock` | `--color-status-followup-*` |
| Inactive | `circle-minus` | `--color-status-inactive-*` |

### 4.2 Count pill (custom)
- **Anatomy:** at least `--size-count` (24) square, pill-shaped, 13px/700 tabular numbers, 6px gap after the label. Never put brackets around the number.
- **Variants:**
  - **Allergy:** `--color-allergy-count-bg` with `--color-allergy-count-fg`.
  - **Neutral:** Notes tab, Conditions. `--color-count-bg`, 1px `--color-count-border`, `--color-count-fg`.
- **Accessible name:** the visible text reads naturally ("Allergies 3"). On the Notes tab, give the pill `aria-label="6 notes"`.

### 4.3 Allergy strip (custom, safety-critical)
- **Markup:** `<section aria-labelledby>` with an h2 ("Allergies" + count pill) and a `<ul>` of chips.
- **Anatomy:**
  - Full width of main, directly under the patient header block and **above the tabs on every tab**.
  - 2px `--color-allergy-border`, `--color-allergy-bg`, `--radius-lg`, padding 12 16.
  - Heading: triangle-alert icon (22px) and 15px/700 text in `--color-allergy-fg`.
  - Chips: 32px tall, pill-shaped, 1px `--color-allergy-border`, `--color-allergy-chip-bg`, 15px/650 text. They wrap.
- **No allergies:** a neutral strip (1px `--color-border-strong`, `--color-text`) with a shield-check icon and the text "No known allergies". Never hide it.
- **Compact sticky behaviour:** once the header block scrolls off, a 48px pinned bar shows the name plus an allergy chip ("3 allergies"). That chip is a `Button` that scrolls back to the strip. It sits at `--z-sticky`, under the header.

### 4.4 Patient table (wide and medium)
- **RAC parts:** `Table`, `TableHeader`, `Column` (`allowsSorting`), `TableBody`, `Row`, `Cell`. Use `sortDescriptor` bound to the URL.
- **Columns:** Name (40%), Age (19%), Last visit (19%), Status, and Actions (68px, header text visually hidden).
- **Anatomy:**
  - Inside a card (1px `--color-border`, `--radius-lg` top corners). The pagination footer closes the card.
  - Header: 48px tall, `--color-surface-subtle`, 13px/600 muted text. The sorted column shows text in `--color-text` and an arrow-up or arrow-down icon. Unsorted columns show a muted arrow-up-down.
  - Rows: at least `--size-row` (52) tall, padding 8 16. Name is a link at 15px/600 and wraps (`overflow-wrap: anywhere`). The age cell has date of birth on a muted 13px second line.
  - "No visits" is shown muted.
- **States:**
  - **Row hover:** `--color-surface-hover` and the name underlined (`[data-hovered]`).
  - **Row focus:** the ring inset by 2px (`outline-offset: -2px`).
  - **Row press:** opens the patient (`onAction`). The row's name stays a real link for middle-click.
  - **Column header:** hover shows the text in `--color-text`. focus-visible gets the ring. Sorting sets `aria-sort`.
- **Row action:** `MenuTrigger` → quiet icon `Button` ("More actions for Martinez, Deborah") → `Popover` + `Menu` with Open, Edit, and "Archive patient…" (danger colour). Archive opens the dialog.
- **Medium:** the same table with 12px cell padding.

### 4.5 Patient card list (compact)
- **RAC parts:** `GridList` with `GridListItem` `href` (the whole card is one link) and `layout="stack"`.
- **Anatomy:**
  - Card: padding 16, 1px `--color-border`, `--radius-lg`, 12px gap.
  - Line 1: "Last, First" at 16px/650, wrapping.
  - Line 2: "79 y · Born 15 Sep 1947", muted.
  - Line 3: "Last visit 19 Oct 2026" with the badge at the end.
- **States:**
  - hover: `--color-surface-hover` with border `--color-border-strong`.
  - pressed: same as hover.
  - focus-visible: the ring.

### 4.6 Pagination (custom)
- **RAC parts:** `Link`s (each page is a URL) in `<nav aria-label="Pagination">`.
- **Anatomy:**
  - "Showing 11–20 of 20" (muted, 14px) on the left. Previous, page numbers and Next on the right, each 44×44.
  - The current page has a 1px `--color-text` border, weight 700 and `aria-current="page"`.
  - Next and Previous at the ends are disabled (`aria-disabled`, disabled colour, not focusable).
  - Long ranges use 1 … 4 5 6 … 50.
- **Compact:** Previous (icon), "Page 2 of 2", Next (icon). Each icon button has an `aria-label`.

### 4.7 Tabs (patient detail)
- **RAC parts:** `Tabs`, `TabList`, `Tab` (`href` for each route: `/patients/:id`, `/notes`, `/summary`), `TabPanel`.
- **Anatomy:** 48px tall, 15px/500 muted text, padding 0 16, and a 1px `--color-border` baseline.
- **States:**
  - **selected:** `--color-text`, weight 650, and a 3px `--color-accent` bar (radius 2) over the baseline.
  - hover: `--color-nav-hover-bg` behind the text.
  - focus-visible: the ring.
- **Compact:** the three tabs share the width equally.

### 4.8 Note composer (custom composition)
- **RAC parts:** `Form`, `DatePicker`, `TimeField`, `TextField` + `TextArea`, `Button`.
- **Anatomy:**
  - A card with padding 20 24 and the h2 "Add a note".
  - Date (200px) and time (140px) side by side, at every size.
  - Help text: "Defaults to now. The clinical time can't be in the future."
  - Note text field, with "Add note" (primary) aligned to the end.
- **Behaviour (F3):**
  - Optimistic insert at the top of the list, then the form clears and focus returns to the textarea.
  - **Failure:** the text stays in the form, a FieldError reads "We couldn't save this note." and a Retry button appears. The optimistic item is removed.
  - **Pending:** the Add note button shows the pending state.

### 4.9 Note item (custom)
- **Markup:** an `<li>` containing an `<article>`.
- **Anatomy:**
  - Header row: `<time>` "13 Jul 2026, 23:30" at 15px/650. When `created_at` is on a different calendar day from `recorded_at`, add "· added 4 months ago" (13px muted, with a `title` attribute holding the absolute time). Delete is a quiet icon button at the end ("Delete note from 13 Jul 2026, 23:30").
  - Body: 15px/1.6, `white-space: pre-line`, max `--measure-note`.
  - Items are separated by 1px `--color-border`, with padding 20 0.
- **Long notes:** clamp the body to 6 lines (`-webkit-line-clamp`). A "Show more" text `Button` (`aria-expanded`, `aria-controls`) expands it with no height animation and becomes "Show less". The stress test is a 5,000-character note.
- **States:**
  - **Optimistic (pending):** opacity 0.7 with "Saving…" in place of the delete button.
  - **Delete:** opens the dialog. After deleting, focus moves to the next note's delete button, or to the textarea if the list is empty, and the toast "Note deleted" shows.

### 4.10 Summary card (custom)
- **Anatomy:**
  - A card with the h2 "Summary" and a provenance label under it. "Regenerate" (secondary, optional) sits at the end.
  - Sections, each with an h3: Identifiers (a 3-column definition list), Key clinical facts (condition chips, allergy chips with triangle icons) and Narrative (1–3 paragraphs at `--measure-note`).
  - Footer: "Based on 6 notes · Generated 5 Nov 2026, 13:15" (13px muted, with a top border).
- **Provenance label:** pill-shaped, 13px/600.
  - **AI-generated:** `--color-info-bg` with `--color-info-fg`, a sparkles icon, and the text "AI-generated, verify before clinical use".
  - **Template:** inactive-status colours, a file-text icon, and the text "Generated from a template".
- **States:**
  - **Loading:** skeleton blocks matching the final layout (label pill, 3 identifier pairs, 2 chip rows, 4 text lines).
  - **No notes:** identifiers and facts still render. The narrative becomes a dashed-border box: "No notes yet, so there's nothing to summarise." with the link "Add the first note" (to the Notes tab).
  - **Error:** inline "We couldn't generate the summary." with Retry. The rest of the page stays usable.
  - **Regenerate pending:** the button is pending and the narrative fades to opacity 0.6 (static under reduced motion).

### 4.11 Clinical snapshot (wide only)
- An `<aside>` card, 300px, background `--color-surface-subtle`, h2 at 16px.
- Contents: Conditions (count pill and list), blood type, last visit, phone and email (links), and "View full profile".
- Shown on the Notes and Summary tabs at ≥1280px. Hidden at medium and compact, where the information lives in Profile.

### 4.12 Profile sections
- Cards titled Contact, Address and Medical, in an auto-fit grid (min 340px), each with a definition list. The footnote reads "Record created 18 Mar 2025 · Last updated 18 Mar 2025".

### 4.13 Dashboard pieces
- **Stat card:** a `Link` card linking to `/patients?status=…`.
  - Label row: icon in its status colour plus 14px/600 muted text.
  - Number: 36px/650, `--tracking-tight` (30px at compact).
  - Grid: 4 columns at wide, 2×2 at compact.
- **Recently seen:** a `GridList` with `href` items. Each row is at least 64px tall: name, a muted second line ("5 y · Last visit 20 Oct 2026") and a badge.
- **Reserved chart slot:** renders nothing in v1. It is shown dashed in the references only.

### 4.14 Skeleton (custom)
- `--color-skeleton` blocks with `--radius-sm` and heights matching the final text. The wrapper has `aria-busy="true"`, and a live region says "Loading patients…".
- Shimmer: see motion.md. Static under reduced motion.
- The table shows 10 rows and the compact list shows 5 cards, at the final row and card heights, so there's no layout shift.

### 4.15 Empty and error states (custom)
- A centred block in the content card: a 56px icon circle (info colours for empty, danger colours for error), an h2, one sentence, and one action.
- **Copy:**
  - "No matches for 'smi'" + "Clear search and filters"
  - "No patients yet" + "Add the first patient"
  - "We couldn't load patients" + Retry (`role="alert"`)
- The search and filters stay usable.

### 4.16 Stepper (custom, create patient)
- **Markup:** `<ol aria-label="Steps to create a patient">` with 4 items. The current item has `aria-current="step"`, and finished items are `Link`s back to their step.
- **Anatomy:**
  - Each item: a 3px top bar, a 28px circle and a 14px label, with a 12px sub-label ("Required", "Optional", "Check and create").
  - **Current:** filled `--color-primary-bg` circle with the number, bold label, accent bar.
  - **Done:** `--color-info-bg` circle with a check, accent bar, label linked and underlined.
  - **Upcoming:** outlined circle, muted label.
- **Compact:** replaced by "Step 1 of 4" and the step name, with a 6px `ProgressBar` (`aria-valuetext="Step 1 of 4"`).

### 4.17 Error summary (custom)
- **Markup:** `<div role="alert" tabIndex={-1}>` that **receives focus on submit**.
- **Anatomy:**
  - 2px `--color-danger-border`, `--color-danger-bg`, `--radius-lg`, padding 16 20.
  - h2: circle-alert icon and "2 problems to fix before you can save" (16px/700 `--color-danger-fg`).
  - List: each item is one link to its field (`href="#field-id"`, focusing the input). The link text is **the field's exact label in bold**, then " – " and the message, for example "**Email** – Enter an email address with a domain, e.g. name@example.com".
- **Server errors:** RFC 9457 `errors[]` are mapped to the same fields and the same summary. A duplicate reads "**Email** – Another patient already uses this email address".
- **Wizard:** each step validates on Continue and shows its own summary.

### 4.18 Tips panel (create patient)
- **Wide:** an `<aside>` (300px, `--color-surface-subtle`) with the h2 "Tips for this step" and 2–3 short paragraphs.
- **Medium and compact:** a `Disclosure` ("Tips for this step", collapsed by default) under the progress indicator.

---

## 5. Overlays

### 5.1 Dialog (confirm)
- **RAC parts:** `ModalOverlay` (scrim `--color-scrim`), `Modal`, `Dialog role="alertdialog"`, `Heading slot="title"`, and `Button`s.
- **Anatomy:**
  - `--size-dialog` wide (the conflict dialog is `--size-dialog-wide`), `--radius-xl`, padding 24 (20 at compact), `--shadow-dialog`.
  - h2 at 20px/650.
  - Actions are aligned to the end. At compact they stack full width, with the primary on top.
- **Focus:** opens on the safest button (Cancel, or "Load their latest changes"). Escape cancels. Focus returns to the trigger when the dialog closes.
- **Instances:**
  - **Delete note:**
    - Title "Delete this note?". Body "This can't be undone.", with a quote of the note's time and first 140 characters.
    - Buttons: Cancel, then **Delete note** (danger solid).
  - **Archive patient:**
    - Title "Archive Ana Terry?". Body "Archived patients are hidden from every screen, including search. Their notes are kept."
    - Buttons: Cancel, then **Archive patient** (danger solid).
    - Afterwards, go to `/patients` and show the toast "Patient archived".
  - **Edit conflict (412 / version mismatch):**
    - Warning icon. Title "Someone else saved this record". Body "Another person saved changes to Ana Terry while you were editing. Choose which version to keep." A bullet list explains each option.
    - Buttons: **Load their latest changes** (primary) and "Overwrite with mine" (secondary).
    - "Load" discards local edits and refetches. "Overwrite" resubmits with the new `version`.

### 5.2 Popover / Menu / Tooltip
- **Popover:** `--color-surface`, 1px `--color-border`, `--radius-md`, `--shadow-popover`, at `--z-popover`.
- **Menu items:** 44px tall, a 16px icon and a 15px label. Hover or focus uses `--color-nav-hover-bg`. The destructive item uses `--color-danger-fg`.
- **Tooltip:** `--color-toast-bg` with `--color-toast-fg`, 13px text, padding 6 10, `--radius-sm`. Uses RAC's default delay. It is supplementary only: never the sole carrier of required information, except the rail labels, which are also present as accessible names.

---

## 6. RAC coverage notes

| Pattern | RAC mapping | Note |
|---|---|---|
| Status filter | `ToggleButtonGroup` | In RAC but not in the brief's list |
| Row actions | `MenuTrigger`, `Menu` | In RAC but not in the brief's list |
| Status radio cards | `RadioGroup` | In RAC but not in the brief's list |
| Breadcrumbs | `Breadcrumbs` | In RAC but not in the brief's list |
| Toast | `UNSTABLE_Toast*` | Unstable API, so pin the version |
| Tag input | custom: `TextField` + `Button` + `TagGroup` | RAC has no tag-input component |
| Stepper | custom `<ol>` + `Link` + `ProgressBar` | RAC has no stepper component |
| Pagination | custom `<nav>` + `Link` | RAC has no pagination component |
| Allergy strip, badges, count pill, skeleton, banner, empty and error states, error summary | custom | Plain semantic HTML |

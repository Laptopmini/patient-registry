# 05 · Screens and states

## Breakpoints
| Name | Width | Layout |
|------|-------|--------|
| **Compact** | 360–767px (design at 360) | Header with a menu button. The sidebar becomes an off-canvas drawer. One column. The patient list is **cards** |
| **Medium** | 768–1279px (design at 768) | The sidebar collapses to an icon rail, with labels in tooltips. The list can be cards or a condensed table (your call) |
| **Wide** | 1280px and up (design at 1280; content max-width about 1440) | Full sidebar with labels. The patient list is a **table** |

Nothing may scroll horizontally at 360px, and layouts must hold at 200% zoom (reflow).

## App shell (every screen)
- **Header:** product name/logo (links to `/`), global patient search (compact: an icon that expands), a **New patient** button, and a placeholder slot for a future user menu.
- **Sidebar:** Dashboard, Patients. Leave visual room for future sections. The active item is marked by more than colour.
- **Main:** a page title (h1), optional breadcrumbs on detail and form pages, then the content.
- A "Skip to main content" link appears on focus.
- A toast region for success and failure messages.
- An offline banner slot, below the header.

## Screens
1. **Dashboard home (`/`)**: greeting and date; count cards (total patients, active, follow-up, inactive); "Recently seen" (the 5 patients with the newest last visit); a quick search. Leave a slot for a later **patient status chart**.
2. **Patient list (`/patients`)**: search, a status filter, sort, the result count, the list (a table on wide screens, cards on compact), and pagination. Table columns: Name, Age, Last visit, Status, plus a row action. Cards show the same four facts, and the whole card is one link.
3. **Patient detail (`/patients/:id`)**: a header block (name, age and date of birth, status badge, blood type, a prominent allergy strip, Edit and Archive actions), then the **Profile**, **Notes** and **Summary** sections.
4. **Patient form (`/patients/new`, `/patients/:id/edit`)**: the Personal and Medical groups, the error summary, inline field errors, and Save/Cancel. On compact screens the actions stay reachable (sticky footer).
5. **404**: inside the shell (see flow F8).
6. **Dialogs**: delete note, archive patient, edit conflict.

## Required states for every screen
| State | What to show |
|-------|--------------|
| **Loading** | Skeletons that match the final layout (no layout shift), with no spinner-only screens. Under reduced motion the skeletons are static |
| **Empty** | Explain why it's empty and offer the next action (for example "No patients yet. Add the first patient", "No notes yet", "No matches for 'smi'. Clear filters") |
| **Error** | Plain-language message, a **Retry** action, and the rest of the page stays usable |
| **Offline** | The offline banner. Last loaded data stays visible and marked as possibly stale. Actions that need the network are disabled or queued with a clear explanation |

Also design these component-level states: **refetching** (results stay, with a subtle indicator), **submitting** (the button shows progress and the form stays editable), **validation error** (per field and in the summary), **conflict**, **success toast**.

## Content to stress-test with
- The very long name (patient 12 in the sample data).
- Patients with no notes, no allergies or no conditions.
- A patient with 3 allergies and 3 conditions.
- A note at the 5,000-character limit (the list should truncate with "Show more").

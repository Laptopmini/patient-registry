# 02 · User flows

Each flow lists its steps and what must be visible. Each one needs designs for the states it passes through.

## F1. Browse, search and filter
1. From the dashboard or sidebar, open **Patients** (`/patients`).
2. The list shows 20 patients per page: name, age, last visit, status. The default sort is last name, A–Z.
3. Type in the search field. Results update about 250ms after typing stops, and typing never freezes. A subtle in-progress indicator appears in the field or results header, while the previous results stay visible (no blank flash).
4. Filter by status (All, Active, Follow-up, Inactive). The result count updates ("42 patients").
5. Sort by name, age or last visit, in either direction, using the column headers on desktop or a "Sort by" control on mobile.
6. Page through the results with previous/next and page numbers.
7. The URL reflects search, filter, sort and page. Reloading or sharing the link restores the same view.
8. **No results:** show a message that names the query, with a "Clear search and filters" action.

## F2. Open a patient
1. Selecting a row or card opens `/patients/:id`.
2. The header shows the full name, age with date of birth, status and blood type. **Allergies are always visible near the top**, labelled with an icon and text (not colour alone). If there are none, show "No known allergies".
3. The main sections are Profile (contact, address, conditions), Notes and Summary. On desktop they appear as tabs or a two-column layout; on mobile, stacked or as tabs.
4. Actions: **Edit** and **Archive patient** (a destructive action that asks for confirmation).

## F3. Add a note and delete a note
1. In Notes, the add form has a date/time field (default: now, in local time, which can't be in the future) and a multi-line text field (1–5,000 characters, with a counter near the limit).
2. Submit: the note appears at the top of the list immediately (optimistic). The form clears, and focus returns to the text field.
3. Notes are listed newest-clinical-time first. Each shows its clinical date/time and the text, and, when different, "added <relative time>".
4. Delete: a confirmation dialog ("Delete this note? This can't be undone.", with **Delete note** and **Cancel**). After deleting, show a toast with the outcome, and move focus to a sensible place.
5. If saving fails, the note stays in the form with an inline error and a **Retry** button.

## F4. View the summary
1. The Summary section shows three things: **identifiers** (name, age, blood type), **key clinical facts** (conditions, allergies) and a **narrative** paragraph drawn from the notes.
2. It shows which engine wrote the narrative: "Generated from a template" or "AI-generated, verify before clinical use".
3. Loading takes a moment, so show a skeleton. With no notes, show "No notes yet, so there's nothing to summarise", but identifiers and facts still appear.
4. A **Regenerate** action is optional and secondary.

## F5. Create a patient
1. **New patient** (in the header or on the list) opens `/patients/new`.
2. The form has two groups. **Personal:** first name, last name, date of birth, email, phone, and address (line 1, line 2, city, region, postal code, country). **Medical:** blood type, status, allergies, conditions.
3. Allergies and conditions are tag inputs: type, press Enter to add, remove with a button. Suggestions are optional.
4. Validation runs when a field loses focus and again on submit. On success, go to the new patient's page and show the toast "Patient created".

## F6. Edit with a validation error
1. **Edit** opens `/patients/:id/edit`, pre-filled.
2. The user enters an invalid phone number (for example "12345") and an email without a domain.
3. Each invalid field shows an inline message under it ("Enter a phone number in international format, e.g. +1 212 555 0100"), with the field in an error style that doesn't rely on colour alone. An **error summary** at the top lists every error, each linking to its field, and receives focus on submit.
4. The server can reject values the client accepted (for example, a duplicate). Those errors show on the same fields in the same way.
5. **Conflict:** someone else saved in the meantime. Show a message offering "Reload their version" or "Overwrite with mine".

## F7. Recover from a network failure
1. While the user is saving the form, the connection drops.
2. The form stays filled. A non-blocking banner reads "You appear to be offline. Your changes are kept. Retry". The submit button becomes available again.
3. Read-only screens show their last loaded data, with an offline badge, plus an inline error with **Retry** if nothing was loaded.
4. When the connection returns, the banner updates ("Back online") and the user can retry.

## F8. Page not found
1. An unknown URL, or a patient ID that doesn't exist or is archived, shows the 404 page.
2. It shows a friendly heading, one sentence of explanation, a **Go to patients** primary action and a **Dashboard** secondary action. The app shell (header and sidebar) stays visible.

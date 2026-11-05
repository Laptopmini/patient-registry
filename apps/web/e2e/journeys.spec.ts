/**
 * The user journeys F1-F8 (design/brief/02-user-flows.md), end to end. Every test that
 * changes data creates its own patients through the API, so none depends on seed order.
 */
import { expect, test } from '@playwright/test';
import {
  addNote,
  archivePatient,
  bumpVersion,
  createPatient,
  fillIdentity,
  ready,
  uniqueSurname,
} from './support';

test.describe('F1 browse, search and filter', () => {
  test('the list URL state survives a reload and a shared link', async ({ page, request }) => {
    const surname = uniqueSurname();
    // 21 patients with one surname: two pages, and nothing else in the seed matches.
    for (let i = 0; i < 21; i++) {
      await createPatient(request, {
        first_name: `Pat${String(i).padStart(2, '0')}`,
        last_name: surname,
        status: 'follow_up',
        date_of_birth: `${1950 + i}-06-15`,
      });
    }

    await page.goto('/patients');
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Patients', level: 1 })).toBeVisible();

    // Search (debounced into the URL, replacing the history entry).
    await page.getByRole('searchbox', { name: 'Search patients' }).fill(surname);
    await expect(page).toHaveURL(new RegExp(`q=${surname}`));
    await expect(page.getByRole('status').filter({ hasText: '21 patients' })).toBeVisible();

    // Filter by status, then sort by age.
    await page.getByRole('radio', { name: /^Follow-up/ }).click();
    await expect(page).toHaveURL(/status=follow_up/);
    await page.getByRole('columnheader', { name: /Age/ }).click();
    await expect(page).toHaveURL(/sort=age/);
    await expect(page.getByRole('row').nth(1)).toContainText('Pat20');

    // Page 2 has the one remaining patient.
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('Showing 21–21 of 21')).toBeVisible();

    const url = page.url();
    await page.reload();
    await ready(page);
    expect(page.url()).toBe(url);
    await expect(page.getByRole('searchbox', { name: 'Search patients' })).toHaveValue(surname);
    await expect(page.getByRole('radio', { name: /^Follow-up/ })).toBeChecked();
    await expect(page.getByRole('link', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('columnheader', { name: /Age/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await expect(page.getByRole('row')).toHaveCount(2);

    // A shared link restores the same view in a fresh page.
    const shared = await page.context().newPage();
    await shared.goto(url);
    await ready(shared);
    await expect(shared.getByText('Showing 21–21 of 21')).toBeVisible();
    await shared.close();
  });

  test('no results names the query and offers to clear it', async ({ page }) => {
    await page.goto('/patients?q=nobodyhasthisname');
    await expect(
      page.getByRole('heading', { name: "No matches for 'nobodyhasthisname'" }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Clear search and filters' }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.getByRole('row').nth(1)).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search patients' })).toHaveValue('');
  });
});

test.describe('F2 open a patient', () => {
  test('a row opens the detail page with allergies near the top', async ({ page, request }) => {
    const patient = await createPatient(request, { allergies: [{ name: 'Latex' }] });
    await page.goto(`/patients?q=${patient.last_name}`);
    await page.getByRole('link', { name: new RegExp(patient.last_name) }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(patient.last_name);
    await expect(page.getByText('Latex').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archive patient' })).toBeVisible();
  });

  test('archiving asks for confirmation, then hides the patient', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}`);
    await page.getByRole('button', { name: 'Archive patient' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText(`Archive Testa ${patient.last_name}?`);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Archive patient' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Archive patient' }).click();
    await expect(page).toHaveURL(/\/patients(\?.*)?$/);
    const gone = await request.get(`/api/patients/${patient.id}`);
    expect(gone.status()).toBe(404);
  });
});

test.describe('F3 notes', () => {
  test('a new note appears at once, before the server answers', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.route('**/api/patients/*/notes', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fallback();
    });
    await page.goto(`/patients/${patient.id}/notes`);
    await ready(page);

    const text = page.getByRole('textbox', { name: /^Note/ });
    await text.fill('Optimistic note: follow-up booked.');
    await page.getByRole('button', { name: 'Add note' }).click();

    // Visible and marked "Saving…" while the request is still held.
    const note = page.getByRole('article').getByText('Optimistic note: follow-up booked.');
    await expect(note).toBeVisible();
    await expect(page.getByText('Saving…')).toBeVisible();
    // The form is cleared and focus is back in the text field.
    await expect(text).toHaveValue('');
    await expect(text).toBeFocused();
    await expect(page.getByText('Saving…')).toBeHidden();
    await expect(note).toHaveCount(1);
  });

  test('a failed save keeps the text, shows an error and retries', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.route('**/api/patients/*/notes', (route) =>
      route.request().method() === 'POST' ? route.abort('failed') : route.fallback(),
    );
    await page.goto(`/patients/${patient.id}/notes`);
    await ready(page);

    await page.getByRole('textbox', { name: /^Note/ }).fill('This one fails first.');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText("We couldn't save this note.")).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Note/ })).toHaveValue('This one fails first.');
    await expect(page.getByRole('list').getByText('This one fails first.')).toHaveCount(0);

    await page.unroute('**/api/patients/*/notes');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('list').getByText('This one fails first.')).toBeVisible();
    await expect(page.getByText("We couldn't save this note.")).toBeHidden();
  });

  test('deleting asks first, then shows a toast and moves focus', async ({ page, request }) => {
    const patient = await createPatient(request);
    await addNote(request, patient.id, 'First note to keep.', '2026-01-02T10:00:00Z');
    await addNote(request, patient.id, 'Second note to delete.', '2026-01-03T10:00:00Z');
    await page.goto(`/patients/${patient.id}/notes`);
    await ready(page);

    const del = page.getByRole('button', { name: /^Delete note from/ }).first();
    await del.click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete this note?' });
    await expect(dialog).toContainText("This can't be undone.");
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(del).toBeFocused();
    await expect(page.getByText('Second note to delete.')).toBeVisible();

    await del.click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Note deleted');
    await expect(page.getByText('Second note to delete.')).toHaveCount(0);
    await expect(page.getByText('First note to keep.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Delete note from/ })).toBeFocused();
  });
});

test.describe('F4 summary', () => {
  test('shows identifiers, facts and which engine wrote the narrative', async ({
    page,
    request,
  }) => {
    const patient = await createPatient(request);
    await addNote(request, patient.id, 'Reviewed asthma control. Peak flow stable.');
    await page.goto(`/patients/${patient.id}/summary`);
    await ready(page);
    await expect(page.getByText('Generated from a template')).toBeVisible();
    await expect(page.getByText('Penicillin').first()).toBeVisible();
  });

  test('without notes there is nothing to summarise', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}/summary`);
    await ready(page);
    await expect(page.getByText("No notes yet, so there's nothing to summarise")).toBeVisible();
  });
});

test.describe('F5 create a patient', () => {
  test('the wizard creates a patient and lands on their page', async ({ page }) => {
    const surname = uniqueSurname();
    await page.goto('/patients/new');
    await ready(page);
    await fillIdentity(page, 'Jessica', surname);
    await page.getByRole('textbox', { name: /Email/ }).fill('jessica@example.com');
    await page.getByRole('button', { name: /^Continue/ }).click();

    await expect(page.getByRole('group', { name: 'Address' })).toBeVisible();
    await page.getByRole('textbox', { name: /Address line 1/ }).fill('1 Test Street');
    await page.getByRole('textbox', { name: /City/ }).fill('Springfield');
    await page.getByRole('button', { name: /^Continue/ }).click();

    await expect(page.getByRole('group', { name: 'Medical' })).toBeVisible();
    await page.getByRole('button', { name: /^Continue/ }).click();

    await expect(page.getByText('Check the details below, then create the patient.')).toBeVisible();
    await page.getByRole('button', { name: 'Create patient' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Jessica ${surname}`);
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText(
      'Patient created',
    );
  });

  test('step 1 blocks Continue and lists what is missing', async ({ page }) => {
    await page.goto('/patients/new');
    await ready(page);
    await page.getByRole('button', { name: /^Continue/ }).click();
    const summary = page.getByRole('alert').filter({ hasText: 'problem' });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await summary.getByRole('link', { name: /First name/ }).click();
    await expect(page.getByRole('textbox', { name: /First name/ })).toBeFocused();
  });

  test('leaving a dirty form asks first', async ({ page }) => {
    await page.goto('/patients/new');
    await page.getByRole('textbox', { name: /First name/ }).fill('Nora');
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(page).toHaveURL(/\/patients\/new/);
  });
});

test.describe('F6 edit with errors', () => {
  test('client errors, then a value only the server rejects', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}/edit`);
    await ready(page);

    const email = page.getByRole('textbox', { name: /Email/ });
    const phone = page.getByRole('textbox', { name: /Phone/ });
    await email.fill('testa@');
    await phone.fill('12345');
    await phone.press('Enter');

    // Client side: an error summary takes focus, each item links to its field.
    const summary = page.getByRole('alert').filter({ hasText: '2 problems' });
    await expect(summary).toBeFocused();
    await expect(
      page.getByText('Enter a phone number in international format').first(),
    ).toBeVisible();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await summary.getByRole('link', { name: /Email/ }).click();
    await expect(email).toBeFocused();

    // Server side: the client accepts this address, the API refuses the reserved domain.
    await email.fill('testa@example.invalid');
    await phone.fill('+44 20 7183 8750');
    await phone.press('Enter');
    const serverSummary = page.getByRole('alert').filter({ hasText: '1 problem' });
    await expect(serverSummary).toBeVisible();
    await expect(serverSummary).toBeFocused();
    await expect(serverSummary.getByRole('link', { name: /Email/ })).toBeVisible();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}/edit`));

    // Fixing the field saves.
    await email.fill('testa@example.org');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`));
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText(
      'Changes saved',
    );
  });

  test('a routed 422 lands on the matching field', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.route(`**/api/patients/${patient.id}`, async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      await route.fulfill({
        status: 422,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: '/problems/validation-error',
          title: 'Unprocessable Content',
          status: 422,
          errors: [
            { field: 'last_name', message: 'That name is not allowed.', type: 'value_error' },
          ],
        }),
      });
    });
    await page.goto(`/patients/${patient.id}/edit`);
    await ready(page);
    await page.getByRole('textbox', { name: /First name/ }).fill('Changed');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('That name is not allowed.').first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Last name/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('the 412 conflict: load their latest changes', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}/edit`);
    await ready(page);
    await bumpVersion(request, patient, { first_name: 'Theirs' });

    await page.getByRole('textbox', { name: /First name/ }).fill('Mine');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Someone else saved this record' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Load their latest changes' })).toBeFocused();

    await dialog.getByRole('button', { name: 'Load their latest changes' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('textbox', { name: /First name/ })).toHaveValue('Theirs');
    // Nothing was overwritten on the server.
    const stored = await (await request.get(`/api/patients/${patient.id}`)).json();
    expect(stored.first_name).toBe('Theirs');
  });

  test('the 412 conflict: overwrite with mine', async ({ page, request }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}/edit`);
    await ready(page);
    await bumpVersion(request, patient, { first_name: 'Theirs' });

    await page.getByRole('textbox', { name: /First name/ }).fill('Mine');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Someone else saved this record' });
    await dialog.getByRole('button', { name: 'Overwrite with mine' }).click();

    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mine');
    const stored = await (await request.get(`/api/patients/${patient.id}`)).json();
    expect(stored.first_name).toBe('Mine');
  });
});

test.describe('F7 offline', () => {
  test('a save while offline keeps the form, and works after recovery', async ({
    page,
    context,
    request,
  }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}/edit`);
    await ready(page);
    await page.getByRole('textbox', { name: /First name/ }).fill('Offline');

    await context.setOffline(true);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('You appear to be offline. Your changes are kept.')).toBeVisible();
    await expect(page.getByText('You’re offline. Your changes are kept')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /First name/ })).toHaveValue('Offline');
    // The submit button is usable again.
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeEnabled();

    await context.setOffline(false);
    await expect(page.getByText('Back online', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Offline');
  });

  test('a read-only screen keeps its data and shows the offline badge', async ({
    page,
    context,
    request,
  }) => {
    const patient = await createPatient(request);
    await page.goto(`/patients/${patient.id}`);
    await ready(page);
    await context.setOffline(true);
    await expect(page.getByText('You appear to be offline')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(patient.last_name);
    await context.setOffline(false);
  });
});

test.describe('F8 not found', () => {
  const heading = (page: import('@playwright/test').Page) =>
    page.getByRole('heading', { name: 'We couldn’t find that page' });

  test('an unknown URL keeps the shell and offers a way out', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(heading(page)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to patients' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await page.getByRole('link', { name: 'Go to patients' }).click();
    await expect(page).toHaveURL(/\/patients/);
  });

  test('an unknown patient id shows the 404 page', async ({ page }) => {
    await page.goto('/patients/00000000-0000-4000-8000-000000000000');
    await expect(heading(page)).toBeVisible();
  });

  test('an archived patient id shows the 404 page', async ({ page, request }) => {
    const patient = await createPatient(request);
    await archivePatient(request, patient.id);
    await page.goto(`/patients/${patient.id}`);
    await expect(heading(page)).toBeVisible();
    await page.goto(`/patients/${patient.id}/edit`);
    await expect(heading(page)).toBeVisible();
  });
});

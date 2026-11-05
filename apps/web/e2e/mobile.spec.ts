/**
 * The phone layout (360px, Chromium): cards instead of a table, selects instead of the
 * segmented filter, no horizontal scroll, and the main flows still work with touch targets
 * of at least 44px.
 */
import { expect, test } from '@playwright/test';
import { createPatient, ready, uniqueSurname } from './support.ts';

test('the list shows cards, with the URL state round-trip through the selects', async ({
  page,
  request,
}) => {
  const surname = uniqueSurname();
  await createPatient(request, { last_name: surname, first_name: 'Ada', status: 'inactive' });
  await createPatient(request, { last_name: surname, first_name: 'Bea', status: 'active' });

  await page.goto('/patients');
  await ready(page);
  await expect(page.getByRole('table')).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Search patients' }).fill(surname);
  await expect(page).toHaveURL(new RegExp(`q=${surname}`));
  await expect(page.getByRole('status').filter({ hasText: '2 patients' })).toBeVisible();

  await page.getByRole('button', { name: /Status/ }).click();
  await page.getByRole('option', { name: 'Inactive' }).click();
  await expect(page).toHaveURL(/status=inactive/);
  await expect(page.getByRole('status').filter({ hasText: '1 patient' })).toBeVisible();

  await page.getByRole('button', { name: /Sort by/ }).click();
  await page.getByRole('option', { name: 'Name, Z–A' }).click();
  await expect(page).toHaveURL(/sort=-last_name/);

  await page.reload();
  await ready(page);
  await expect(page.getByRole('searchbox', { name: 'Search patients' })).toHaveValue(surname);
  await expect(page.getByRole('row', { name: /Ada/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Bea/ })).toHaveCount(0);
});

test('a note can be added on a phone, and buttons are big enough to tap', async ({
  page,
  request,
}) => {
  const patient = await createPatient(request);
  await page.goto(`/patients/${patient.id}/notes`);
  await ready(page);

  await page.getByRole('textbox', { name: /^Note/ }).fill('Added from a phone.');
  const add = page.getByRole('button', { name: 'Add note' });
  const box = await add.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await add.click();
  await expect(page.getByRole('article').getByText('Added from a phone.')).toBeVisible();

  for (const control of await page.getByRole('button').all()) {
    if (!(await control.isVisible())) continue;
    const size = await control.boundingBox();
    if (!size) continue;
    const name = (await control.getAttribute('aria-label')) ?? (await control.textContent());
    expect.soft(size.height, `${name} is at least 44px tall`).toBeGreaterThanOrEqual(44);
    expect.soft(size.width, `${name} is at least 44px wide`).toBeGreaterThanOrEqual(44);
  }
});

test('the drawer navigation opens and closes with the keyboard', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: /menu/i }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('the wizard fits 360px without horizontal scroll', async ({ page }) => {
  await page.goto('/patients/new');
  await ready(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

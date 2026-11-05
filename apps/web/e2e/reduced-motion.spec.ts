/**
 * With prefers-reduced-motion: reduce, nothing animates: after navigating, opening and
 * closing a dialog, and adding a note, `document.getAnimations()` is empty.
 */
import { expect, type Page, test } from '@playwright/test';
import { addNote, createPatient, ready } from './support';

test.use({ reducedMotion: 'reduce' });

/** Gives any started animation or View Transition a chance to appear, then counts them. */
async function animations(page: Page) {
  await page.waitForTimeout(300);
  return page.evaluate(() =>
    document.getAnimations().map((a) => `${a.constructor.name}:${a.playState}`),
  );
}

test('navigating between routes does not animate', async ({ page, request }) => {
  const patient = await createPatient(request);
  await addNote(request, patient.id, 'A note.');
  await page.goto('/');
  await ready(page);
  expect(await animations(page)).toEqual([]);

  await page
    .getByRole('navigation')
    .getByRole('link', { name: /^Patients/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/patients/);
  await ready(page);
  expect(await animations(page)).toEqual([]);

  // Searching cross-fades the results in a View Transition when motion is allowed.
  await page.getByRole('searchbox', { name: 'Search patients' }).fill(patient.last_name);
  await expect(page.getByRole('row')).toHaveCount(2);
  expect(await animations(page)).toEqual([]);

  await page.getByRole('link', { name: new RegExp(patient.last_name) }).click();
  await ready(page);
  expect(await animations(page)).toEqual([]);

  await page.getByRole('tab', { name: /^Notes/ }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await ready(page);
  expect(await animations(page)).toEqual([]);
});

test('opening and closing a dialog does not animate', async ({ page, request }) => {
  const patient = await createPatient(request);
  await page.goto(`/patients/${patient.id}`);
  await ready(page);

  await page.getByRole('button', { name: 'Archive patient' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  expect(await animations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  expect(await animations(page)).toEqual([]);
});

test('adding a note and its toast do not animate', async ({ page, request }) => {
  const patient = await createPatient(request);
  await page.goto(`/patients/${patient.id}/notes`);
  await ready(page);

  await page.getByRole('textbox', { name: /^Note/ }).fill('A quiet note.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByRole('article').getByText('A quiet note.')).toBeVisible();
  expect(await animations(page)).toEqual([]);
  await expect(page.getByText('Saving…')).toBeHidden();
  expect(await animations(page)).toEqual([]);

  // Deleting shows a toast, which also enters without motion.
  await page.getByRole('button', { name: /^Delete note from/ }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Note deleted');
  expect(await animations(page)).toEqual([]);
});

test('loading skeletons and busy buttons do not pulse', async ({ page }) => {
  await page.route('**/api/patients?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fallback();
  });
  await page.goto('/patients');
  await page.locator('[aria-busy="true"]').first().waitFor();
  expect(await animations(page)).toEqual([]);
});

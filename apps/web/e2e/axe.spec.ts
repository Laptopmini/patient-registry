/**
 * Accessibility: axe on every route and key state (dialogs open, form errors shown), in
 * light and dark, at 360 and 1280. Zero violations at WCAG 2.2 AA.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { addNote, createPatient, fillIdentity, type Patient, ready } from './support';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const WIDTHS = [360, 1280] as const;
const SCHEMES = ['light', 'dark'] as const;

let patient: Patient;
let emptyPatient: Patient;

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL: baseURL as string });
  patient = await createPatient(request, {
    allergies: [{ name: 'Penicillin' }, { name: 'Latex' }],
    address: {
      line1: '1 Test Street',
      line2: null,
      city: 'Springfield',
      region: 'IL',
      postal_code: '62701',
      country: 'US',
    },
  });
  for (const [i, body] of [
    'Reviewed asthma control. Peak flow stable.',
    'Phone follow-up: no new symptoms reported.',
    'Annual review booked.',
  ].entries()) {
    await addNote(
      request,
      patient.id,
      body,
      new Date(Date.now() - (i + 1) * 86_400_000).toISOString(),
    );
  }
  emptyPatient = await createPatient(request);
  await request.dispose();
});

interface State {
  name: string;
  path: () => string;
  /** Drives the page into the state to check (dialog open, errors shown...). */
  act?: (page: Page) => Promise<void>;
  /** Called before navigation, for routed responses. */
  prepare?: (page: Page) => Promise<void>;
}

const states: State[] = [
  { name: 'dashboard', path: () => '/' },
  { name: 'patient list', path: () => '/patients' },
  { name: 'patient list, no results', path: () => '/patients?q=nobodyhasthisname' },
  {
    name: 'patient list, load error',
    path: () => '/patients',
    prepare: async (page) => {
      await page.route('**/api/patients?**', (route) => route.abort());
    },
  },
  { name: 'patient profile', path: () => `/patients/${patient.id}` },
  { name: 'patient notes', path: () => `/patients/${patient.id}/notes` },
  { name: 'patient summary', path: () => `/patients/${patient.id}/summary` },
  { name: 'patient summary, no notes', path: () => `/patients/${emptyPatient.id}/summary` },
  {
    name: 'archive dialog',
    path: () => `/patients/${patient.id}`,
    act: async (page) => {
      await page.getByRole('button', { name: 'Archive patient' }).click();
      await page.getByRole('alertdialog').waitFor();
    },
  },
  {
    name: 'delete note dialog',
    path: () => `/patients/${patient.id}/notes`,
    act: async (page) => {
      await page
        .getByRole('button', { name: /^Delete note from/ })
        .first()
        .click();
      await page.getByRole('alertdialog').waitFor();
    },
  },
  {
    name: 'note form error',
    path: () => `/patients/${patient.id}/notes`,
    act: async (page) => {
      await page.getByRole('button', { name: 'Add note' }).click();
      await page.locator('[aria-invalid="true"]').first().waitFor();
    },
  },
  { name: 'wizard step 1', path: () => '/patients/new' },
  {
    name: 'wizard step 1 with errors',
    path: () => '/patients/new',
    act: async (page) => {
      await page.getByRole('button', { name: /^Continue/ }).click();
      await page.getByRole('alert').filter({ hasText: 'problem' }).waitFor();
    },
  },
  {
    name: 'wizard step 2',
    path: () => '/patients/new',
    act: async (page) => {
      await fillIdentity(page, 'Jessica', 'Wall');
      await page.getByRole('button', { name: /^Continue/ }).click();
      await page.getByRole('group', { name: 'Address' }).waitFor();
    },
  },
  {
    name: 'wizard review',
    path: () => '/patients/new',
    act: async (page) => {
      await fillIdentity(page, 'Jessica', 'Wall');
      await page.getByRole('button', { name: 'Skip optional steps and review' }).click();
      await page.getByText('Check the details below, then create the patient.').waitFor();
    },
  },
  {
    name: 'unsaved changes dialog',
    path: () => '/patients/new',
    act: async (page) => {
      await page.getByRole('textbox', { name: /First name/ }).fill('Nora');
      await page.getByRole('link', { name: 'Cancel' }).click();
      await page.getByRole('alertdialog').waitFor();
    },
  },
  { name: 'edit form', path: () => `/patients/${patient.id}/edit` },
  {
    name: 'edit form with errors',
    path: () => `/patients/${patient.id}/edit`,
    act: async (page) => {
      await page.getByRole('textbox', { name: /Email/ }).fill('testa@');
      const phone = page.getByRole('textbox', { name: /Phone/ });
      await phone.fill('12345');
      await phone.press('Enter');
      await page.getByRole('alert').filter({ hasText: 'problem' }).waitFor();
    },
  },
  {
    name: 'edit form with a server error',
    path: () => `/patients/${patient.id}/edit`,
    act: async (page) => {
      await page.getByRole('textbox', { name: /Email/ }).fill('testa@example.invalid');
      await page.getByRole('textbox', { name: /Email/ }).press('Enter');
      await page.getByRole('alert').filter({ hasText: 'problem' }).waitFor();
    },
  },
  {
    name: 'conflict dialog',
    path: () => `/patients/${patient.id}/edit`,
    prepare: async (page) => {
      await page.route(`**/api/patients/${patient.id}`, (route) =>
        route.request().method() === 'PUT'
          ? route.fulfill({
              status: 412,
              contentType: 'application/problem+json',
              body: JSON.stringify({
                type: 'about:blank',
                title: 'Precondition Failed',
                status: 412,
              }),
            })
          : route.fallback(),
      );
    },
    act: async (page) => {
      await page.getByRole('textbox', { name: /First name/ }).fill('Changed');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByRole('alertdialog').waitFor();
    },
  },
  {
    name: 'offline banner',
    path: () => `/patients/${patient.id}/edit`,
    act: async (page) => {
      await page.context().setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));
      await page.getByText('You appear to be offline').waitFor();
    },
  },
  { name: 'not found', path: () => '/no-such-page' },
  {
    name: 'not found, unknown patient',
    path: () => '/patients/00000000-0000-4000-8000-000000000000',
  },
];

for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    test.describe(`${scheme}, ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 900 } });

      for (const state of states) {
        test(`${state.name} has no axe violations`, async ({ page }) => {
          await state.prepare?.(page);
          await page.goto(state.path());
          await ready(page);
          await state.act?.(page);
          await page.evaluate(() => document.fonts.ready);
          // Let focus moves and enter transitions finish before measuring contrast.
          await page.waitForTimeout(500);

          const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
          const summary = results.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.map((node) => node.target.join(' ')),
          }));
          expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);

          // No horizontal scroll at 360 CSS px.
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
          );
          expect(overflow).toBe(false);
        });
      }
    });
  }
}

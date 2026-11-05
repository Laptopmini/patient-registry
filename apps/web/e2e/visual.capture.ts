/**
 * Visual capture and accessibility smoke for the screens built so far (not a CI test yet).
 *
 *   BASE_URL=http://localhost:8083 pnpm capture
 *
 * Captures every screen at 360, 768 and 1280 in light and dark, with the clock frozen at
 * 5 Nov 2026 13:10 in America/Los_Angeles and an en-GB locale (the references use "5 Nov
 * 2026"). Screenshots go to test-results/visual/ (git-ignored); axe violations are printed
 * and written next to them. The exit code is 1 when any violation is found.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Browser, chromium, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:8083';
const OUT = new URL('../test-results/visual/', import.meta.url).pathname;
const WIDTHS = [360, 768, 1280] as const;
const SCHEMES = ['light', 'dark'] as const;
const ONLY = process.env.ONLY?.split(',');

interface PatientRef {
  id: string;
  hasNotes: boolean;
  noNotes: boolean;
}

/** Picks seeded (synthetic) patients to point the screens at. */
async function pickPatients(): Promise<{
  rich: PatientRef;
  empty: PatientRef;
  list: { id: string; first_name: string; last_name: string }[];
}> {
  const list = (await (await fetch(`${BASE}/api/patients?limit=100`)).json()) as {
    items: { id: string; first_name: string; last_name: string }[];
  };
  let rich: PatientRef | undefined;
  let empty: PatientRef | undefined;
  for (const item of list.items) {
    const detail = (await (await fetch(`${BASE}/api/patients/${item.id}`)).json()) as {
      allergies: unknown[];
    };
    const notes = (await (await fetch(`${BASE}/api/patients/${item.id}/notes`)).json()) as {
      items: unknown[];
    };
    if (!rich && detail.allergies.length >= 2 && notes.items.length >= 3) {
      rich = { id: item.id, hasNotes: true, noNotes: false };
    }
    if (!empty && notes.items.length === 0) empty = { id: item.id, hasNotes: false, noNotes: true };
  }
  if (!rich) throw new Error('No patient with allergies and notes in the seed data');
  return { rich, empty: empty ?? rich, list: list.items };
}

interface Screen {
  name: string;
  path: string;
  /** Only the first scheme/width pair is captured for states that are the same everywhere. */
  once?: boolean;
  prepare?: (page: Page) => Promise<void>;
  after?: (page: Page) => Promise<void>;
}

/** Step 1 of the wizard: name and date of birth (typed into the localised segments). */
async function fillWizardStep1(page: Page) {
  await page.getByRole('textbox', { name: /First name/ }).fill('Jessica');
  await page.getByRole('textbox', { name: /Last name/ }).fill('Wall');
  await page.getByRole('spinbutton', { name: /day, Date of birth/i }).click();
  await page.keyboard.type('23022019');
}

/** Waits for the page to be ready: no network-idle (the flag stream never goes idle), so look at the DOM. */
const settle = async (page: Page) => {
  await page.locator('main h1').first().waitFor();
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
};

function screens(p: Awaited<ReturnType<typeof pickPatients>>): Screen[] {
  return [
    { name: 'dashboard', path: '/' },
    { name: 'patient-list', path: '/patients' },
    {
      name: 'patient-list-loading',
      path: '/patients',
      prepare: async (page) => {
        await page.route('**/api/patients?**', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 8000));
          await route.abort();
        });
      },
      after: async (page) => {
        await page.waitForSelector('[aria-busy="true"]');
      },
    },
    { name: 'patient-list-empty', path: '/patients?q=zzzzqq' },
    {
      name: 'patient-list-error',
      path: '/patients',
      prepare: async (page) => {
        await page.route('**/api/patients?**', (route) => route.abort());
      },
    },
    { name: 'patient-detail-profile', path: `/patients/${p.rich.id}` },
    { name: 'patient-detail-notes', path: `/patients/${p.rich.id}/notes` },
    { name: 'patient-detail-summary', path: `/patients/${p.rich.id}/summary` },
    { name: 'patient-detail-summary-empty', path: `/patients/${p.empty.id}/summary` },
    {
      name: 'dialog-archive-patient',
      path: `/patients/${p.rich.id}`,
      after: async (page) => {
        await page.getByRole('button', { name: 'Archive patient' }).click();
        await page.getByRole('alertdialog').waitFor();
      },
    },
    {
      name: 'dialog-delete-note',
      path: `/patients/${p.rich.id}/notes`,
      after: async (page) => {
        await page
          .getByRole('button', { name: /^Delete note from/ })
          .first()
          .click();
        await page.getByRole('alertdialog').waitFor();
      },
    },
    { name: 'patient-form', path: '/patients/new' },
    {
      name: 'patient-form-step2',
      path: '/patients/new',
      once: true,
      after: async (page) => {
        await fillWizardStep1(page);
        await page.getByRole('button', { name: /^Continue/ }).click();
        await page.getByRole('group', { name: 'Address' }).waitFor();
      },
    },
    {
      name: 'patient-form-step1-errors',
      path: '/patients/new',
      once: true,
      after: async (page) => {
        await page.getByRole('button', { name: /^Continue/ }).click();
        await page.getByRole('alert').filter({ hasText: 'problem' }).waitFor();
      },
    },
    {
      name: 'patient-form-review',
      path: '/patients/new',
      after: async (page) => {
        await fillWizardStep1(page);
        await page.getByRole('button', { name: 'Skip optional steps and review' }).click();
        await page.getByText('Check the details below, then create the patient.').waitFor();
      },
    },
    {
      name: 'dialog-unsaved-changes',
      path: '/patients/new',
      once: true,
      after: async (page) => {
        await page.getByRole('textbox', { name: /First name/ }).fill('Nora');
        await page.getByRole('link', { name: 'Cancel' }).click();
        await page.getByRole('alertdialog').waitFor();
      },
    },
    {
      name: 'patient-form-errors',
      path: `/patients/${p.rich.id}/edit`,
      after: async (page) => {
        await page.getByRole('textbox', { name: /Email/ }).fill('ana.terry@');
        // Enter, not a click: the blur validation inserts messages that move the button.
        await page.getByRole('textbox', { name: /Phone/ }).fill('12345');
        await page.getByRole('textbox', { name: /Phone/ }).press('Enter');
        await page.getByRole('alert').filter({ hasText: 'problem' }).waitFor();
      },
    },
    {
      name: 'dialog-conflict',
      path: `/patients/${p.rich.id}/edit`,
      prepare: async (page) => {
        await page.route('**/api/patients/*', async (route) => {
          if (route.request().method() !== 'PUT') return route.fallback();
          await route.fulfill({
            status: 412,
            contentType: 'application/problem+json',
            body: JSON.stringify({
              type: 'about:blank',
              title: 'Precondition Failed',
              status: 412,
            }),
          });
        });
      },
      after: async (page) => {
        await page.getByRole('textbox', { name: /First name/ }).fill('Changed');
        await page.getByRole('button', { name: 'Save changes' }).click();
        await page.getByRole('alertdialog').waitFor();
      },
    },
    {
      name: 'offline-banner',
      path: `/patients/${p.rich.id}/edit`,
      after: async (page) => {
        await page.context().setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));
        await page.getByText('You appear to be offline').waitFor();
      },
    },
    { name: 'not-found', path: '/no-such-page' },
    ...(process.env.STYLEGUIDE ? [{ name: 'styleguide', path: '/__styleguide' }] : []),
  ];
}

async function capture(
  browser: Browser,
  screen: Screen,
  width: number,
  scheme: (typeof SCHEMES)[number],
) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: scheme,
    locale: 'en-GB',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime('2026-11-05T13:10:00-08:00');
  await screen.prepare?.(page);
  await page.goto(`${BASE}${screen.path}`);
  if (!screen.name.includes('loading')) await settle(page);
  await screen.after?.(page);
  if (!screen.name.includes('loading')) await settle(page);
  const file = `${screen.name}-${width}-${scheme}`;
  await page.screenshot({ path: `${OUT}${file}.png`, fullPage: true });
  // Under prefers-reduced-motion nothing may be animating.
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === 'running').length,
  );
  const horizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  await context.close();
  return {
    file,
    horizontalScroll,
    violations: [
      ...(running > 0
        ? [
            {
              id: 'reduced-motion',
              impact: 'serious',
              help: `${running} running animations`,
              nodes: [],
            },
          ]
        : []),
      ...axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      })),
    ],
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const patients = await pickPatients();
  const browser = await chromium.launch();
  const results = [];
  for (const screen of screens(patients)) {
    if (ONLY && !ONLY.includes(screen.name)) continue;
    for (const scheme of SCHEMES) {
      for (const width of WIDTHS) {
        if (screen.once && (scheme !== 'light' || width !== 1280)) continue;
        try {
          results.push(await capture(browser, screen, width, scheme));
        } catch (error) {
          results.push({
            file: `${screen.name}-${width}-${scheme}`,
            horizontalScroll: false,
            violations: [
              { id: 'capture-failed', impact: 'critical', help: String(error), nodes: [] },
            ],
          });
        }
      }
    }
  }
  await browser.close();
  writeFileSync(`${OUT}axe-results.json`, JSON.stringify(results, null, 2));
  const bad = results.filter((r) => r.violations.length > 0 || r.horizontalScroll);
  for (const r of bad) {
    // biome-ignore lint/suspicious/noConsole: this is a command-line script
    console.log(
      r.file,
      r.horizontalScroll ? 'HORIZONTAL SCROLL' : '',
      JSON.stringify(r.violations),
    );
  }
  // biome-ignore lint/suspicious/noConsole: this is a command-line script
  console.log(`${results.length} captures, ${bad.length} with axe violations or horizontal scroll`);
  process.exit(bad.length > 0 ? 1 : 0);
}

await main();

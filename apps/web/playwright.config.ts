import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end and accessibility checks against the running Compose stack:
 *
 *   docker compose down -v && docker compose up --build --wait
 *   BASE_URL=http://localhost:8080 pnpm e2e
 *
 * Chromium and Firefox at 1280, plus Chromium at 360 (the phone layout).
 */
const baseURL = process.env.BASE_URL ?? 'http://localhost:8080';

const common = { baseURL, locale: 'en-GB', timezoneId: 'Europe/London' } as const;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { ...common, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium-1280',
      testIgnore: ['**/mobile.spec.ts'],
      use: { ...devices['Desktop Chrome'], ...common, viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'firefox-1280',
      // Axe results do not depend on the engine, so Firefox runs the journeys only.
      testIgnore: ['**/mobile.spec.ts', '**/axe.spec.ts'],
      use: { ...devices['Desktop Firefox'], ...common, viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'chromium-360',
      testMatch: ['**/mobile.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        ...common,
        viewport: { width: 360, height: 740 },
        hasTouch: true,
      },
    },
  ],
});

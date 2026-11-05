/**
 * Lighthouse CI against the running Compose stack, on the mobile and desktop presets, for
 * `/`, `/patients` and a patient detail page. `lighthouserc.json` holds the assertions.
 *
 *   BASE_URL=http://localhost:8080 pnpm lhci
 *
 * The detail page's id is read from the API (the first patient in the list), so the URLs
 * are built here rather than listed in the config. Chrome comes from Playwright's Chromium
 * unless CHROME_PATH is set.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { chromium } from '@playwright/test';

const out = (text) => process.stdout.write(`${text}\n`);

const base = (process.env.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const list = await fetch(`${base}/api/patients?limit=1`);
if (!list.ok) throw new Error(`The API at ${base} answered ${list.status}. Is the stack up?`);
const { items } = await list.json();
const patientId = items[0]?.id;
if (!patientId) throw new Error('No patients to audit. Seed the database first.');

const urls = [`${base}/`, `${base}/patients`, `${base}/patients/${patientId}`];
const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();

rmSync(new URL('../.lighthouseci', import.meta.url), { recursive: true, force: true });

let failed = false;
for (const preset of ['mobile', 'desktop']) {
  out(`\n=== Lighthouse ${preset} ===`);
  const args = [
    'exec',
    'lhci',
    'autorun',
    ...urls.map((url) => `--collect.url=${url}`),
    // Mobile is Lighthouse's default; only desktop is a preset.
    ...(preset === 'desktop' ? ['--collect.settings.preset=desktop'] : []),
    `--upload.outputDir=.lighthouseci/${preset}`,
  ];
  const result = spawnSync('pnpm', args, {
    stdio: 'inherit',
    env: { ...process.env, CHROME_PATH: chromePath },
  });
  if (result.status !== 0) failed = true;
}

// A table of the median score per category, for each page and preset.
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const preset of ['mobile', 'desktop']) {
  const dir = new URL(`../.lighthouseci/${preset}/`, import.meta.url);
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => /\.report\.json$/.test(f));
  } catch {
    continue;
  }
  const byUrl = new Map();
  for (const file of files) {
    const lhr = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    const url = new URL(lhr.finalDisplayedUrl).pathname.replace(/[0-9a-f-]{36}/, ':id');
    const scores = byUrl.get(url) ?? [];
    scores.push(CATEGORIES.map((c) => Math.round(lhr.categories[c].score * 100)));
    byUrl.set(url, scores);
  }
  out(`\nMedian scores, ${preset}: ${CATEGORIES.join(' / ')}`);
  for (const [url, runs] of byUrl) {
    out(
      `  ${url.padEnd(18)} ${CATEGORIES.map((_, i) => median(runs.map((r) => r[i]))).join(' / ')}`,
    );
  }
}
process.exit(failed ? 1 : 0);

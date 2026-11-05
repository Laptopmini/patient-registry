// Copies the self-hosted Inter variable font (Latin subset, SIL OFL 1.1) from
// @fontsource-variable/inter into public/fonts, so the app makes no third-party requests.
// The copy is committed too, because the dev container runs `vite` directly.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const source = join(
  dirname(require.resolve('@fontsource-variable/inter/package.json')),
  'files',
  'inter-latin-wght-normal.woff2',
);
const target = new URL('../public/fonts/InterVariable.woff2', import.meta.url).pathname;
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

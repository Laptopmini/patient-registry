import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { toastQueue } from '../lib/toast';
import { resetDb } from './handlers';
import { server } from './server';
import { resetViewport } from './viewport';

// Lazy route chunks load slower on CI runners than locally; give findBy* queries room.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetDb();
  resetViewport();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  toastQueue.clear();
});
afterAll(() => server.close());

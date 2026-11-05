import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { toastQueue } from '../lib/toast';
import { resetDb } from './handlers';
import { server } from './server';
import { resetViewport } from './viewport';

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

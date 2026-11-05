import { createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '../AppProviders';
import { createQueryClient } from '../api/queryClient';
import { createAppRouter } from '../router';
import { setViewportWidth } from './viewport';

interface Options {
  /** Initial URL, for example `/patients?q=smi`. */
  path?: string;
  /** Viewport width in px; 1280 renders the table list, 360 the cards. */
  width?: number;
}

/**
 * Renders the whole app (shell, toast region, routes) at a URL, with a fresh QueryClient
 * (retries off) and a router on memory history.
 */
export function renderWithProviders({ path = '/', width = 1280 }: Options = {}) {
  setViewportWidth(width);
  const queryClient = createQueryClient({ retry: false });
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createAppRouter({ queryClient, history });
  const user = userEvent.setup();
  const view = render(<AppProviders queryClient={queryClient} router={router} />);
  return { ...view, user, router, queryClient };
}

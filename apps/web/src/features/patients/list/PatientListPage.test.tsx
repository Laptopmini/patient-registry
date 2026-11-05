import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { pageItems } from '../../../components/ui/Pagination';
import { db } from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { server } from '../../../test/server';

/** The last page request (the status counts are `limit=1` requests, so skip those). */
const lastRequest = () => db.listRequests.findLast((request) => request.get('limit') === '20');

/** The result count is "<strong>45</strong> patients", so match on the status element's text. */
const resultCount = (text: string) =>
  screen.findByText(
    (_, element) => element?.getAttribute('role') === 'status' && element.textContent === text,
  );

describe('patient list', () => {
  it('renders rows as "Last, First" with status text', async () => {
    renderWithProviders({ path: '/patients' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Patients' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Abernathy, Alice' })).toBeInTheDocument();
    expect(await resultCount('45 patients')).toBeInTheDocument();
    const table = screen.getByRole('grid', { name: 'Patients' });
    expect(within(table).getAllByRole('row')).toHaveLength(21); // header + 20
  });

  it('renders cards instead of a table on compact screens', async () => {
    renderWithProviders({ path: '/patients', width: 360 });
    expect(await screen.findByRole('grid', { name: 'Patients' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by/ })).toBeInTheDocument();
  });

  it('writes typed search to the URL after a debounce and sends q', async () => {
    const { user, router } = renderWithProviders({ path: '/patients' });
    await resultCount('45 patients');
    await user.type(screen.getByRole('searchbox', { name: /Search patients/ }), 'abern');

    // Typing is never blocked, and the URL only changes after the debounce.
    expect(router.state.location.search).not.toHaveProperty('q');
    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'abern' }));
    await waitFor(() => expect(lastRequest()?.get('q')).toBe('abern'));
    expect(await resultCount('5 patients')).toBeInTheDocument();
  });

  it('keeps previous results visible while the next ones load', async () => {
    const { user } = renderWithProviders({ path: '/patients' });
    await resultCount('45 patients');
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('/api/patients', async () => {
        await gate;
        return HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 });
      }),
    );
    await user.type(screen.getByRole('searchbox', { name: /Search patients/ }), 'zzz');
    expect(await screen.findByText('Updating results…')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abernathy, Alice' })).toBeInTheDocument();
    release();
    expect(await screen.findByText(/No matches for 'zzz'/)).toBeInTheDocument();
  });

  it('changes the sort through the column header, the URL and the request', async () => {
    const { user, router } = renderWithProviders({ path: '/patients' });
    await resultCount('45 patients');
    await user.click(screen.getByRole('columnheader', { name: /Last visit/ }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ sort: 'last_visit' }));
    await waitFor(() => expect(lastRequest()?.get('sort')).toBe('last_visit'));
  });

  it('paginates with page numbers and previous/next', async () => {
    const { user, router } = renderWithProviders({ path: '/patients' });
    await resultCount('45 patients');
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    await user.click(within(nav).getByRole('link', { name: 'Next' }));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 2 }));
    await waitFor(() => expect(lastRequest()?.get('offset')).toBe('20'));
    await user.click(within(nav).getByRole('link', { name: 'Page 3' }));
    await waitFor(() => expect(lastRequest()?.get('offset')).toBe('40'));
    expect(within(nav).getByRole('link', { name: 'Page 3' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('falls back to defaults for an invalid URL', async () => {
    renderWithProviders({ path: '/patients?page=abc&sort=bogus&status=nope' });
    expect(await resultCount('45 patients')).toBeInTheDocument();
    expect(lastRequest()?.get('offset')).toBe('0');
    expect(lastRequest()?.get('sort')).toBe('last_name');
  });

  it('shows the empty state and clears the search and filters', async () => {
    const { user, router } = renderWithProviders({ path: '/patients?q=nomatch&status=active' });
    expect(await screen.findByText(/No matches for 'nomatch'/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(await resultCount('45 patients')).toBeInTheDocument();
    expect(router.state.location.search).toEqual({});
    expect(screen.getByRole('searchbox', { name: /Search patients/ })).toHaveValue('');
  });

  it('shows an error state with Retry', async () => {
    server.use(http.get('/api/patients', () => HttpResponse.error()));
    const { user } = renderWithProviders({ path: '/patients' });
    expect(await screen.findByText("We couldn't load patients")).toBeInTheDocument();
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await resultCount('45 patients')).toBeInTheDocument();
  });
});

describe('pageItems', () => {
  it('collapses long runs and keeps first, last and neighbours', () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(5, 10)).toEqual([1, { gapAfter: 1 }, 4, 5, 6, { gapAfter: 6 }, 10]);
  });
});

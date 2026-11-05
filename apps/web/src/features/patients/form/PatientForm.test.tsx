import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { db, problem } from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { server } from '../../../test/server';

const FIRST_ID = '00000000-0000-4000-8000-000000000000';

async function fillRequired(user: UserEvent) {
  await user.type(screen.getByRole('textbox', { name: /First name/ }), 'Nora');
  await user.type(screen.getByRole('textbox', { name: /Last name/ }), 'Whitfield');
  await user.click(screen.getByRole('spinbutton', { name: /month, Date of birth/i }));
  await user.keyboard('03151985');
}

const press = (user: UserEvent, name: string | RegExp) =>
  user.click(screen.getByRole('button', { name }));

const openNew = async (path = '/patients/new') => {
  const view = renderWithProviders({ path });
  await screen.findByRole('heading', { level: 1, name: 'New patient' });
  return view;
};

/** Fills the required fields and walks to the review step by pressing Continue. */
async function reachReview(user: UserEvent) {
  await fillRequired(user);
  await press(user, /^Continue/);
  await press(user, /^Continue/);
  await press(user, /^Continue/);
  await screen.findByText('Check the details below, then create the patient.');
}

describe('create wizard', () => {
  it('validates step 1 on Continue, lists errors as "Label – message" and focuses the summary', async () => {
    const { user, router } = await openNew();
    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'nora@');
    await user.type(screen.getByRole('textbox', { name: /Phone/ }), '12345');
    await press(user, /^Continue/);

    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(within(summary).getByRole('heading')).toHaveTextContent(
      '5 problems to fix before you can continue',
    );
    const first = within(summary).getByRole('link', { name: /First name – Enter a first name/ });
    expect(within(first).getByText('First name').tagName).toBe('STRONG');
    expect(
      within(summary).getByRole('link', { name: /Date of birth – Enter a date of birth/ }),
    ).toBeVisible();
    expect(
      within(summary).getByRole('link', {
        name: 'Email – Enter an email address with a domain, e.g. name@example.com',
      }),
    ).toBeVisible();
    expect(
      within(summary).getByRole('link', {
        name: 'Phone – Enter a phone number in international format, e.g. +1 212 555 0100',
      }),
    ).toBeVisible();

    // Each field shows its own error, and the step did not change.
    const field = screen.getByRole('textbox', { name: /First name/ });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/Enter a first name/);
    expect(router.state.location.search).toMatchObject({ step: 1 });

    // The summary link moves focus to the field.
    await user.click(first);
    expect(field).toHaveFocus();
  });

  it('sends a jump to a later step back to the first incomplete one', async () => {
    const { router } = await openNew('/patients/new?step=3');
    expect(await screen.findByRole('group', { name: 'Patient details' })).toBeVisible();
    await waitFor(() => expect(router.state.location.search).toMatchObject({ step: 1 }));
  });

  it('moves through the steps, keeps the stepper accurate and keeps data when going back', async () => {
    const { user, router } = await openNew();
    await fillRequired(user);
    await press(user, /^Continue/);
    expect(await screen.findByRole('group', { name: 'Address' })).toBeVisible();
    expect(router.state.location.search).toMatchObject({ step: 2 });
    const steps = screen.getByRole('list', { name: 'Steps to create a patient' });
    expect(within(steps).getByRole('listitem', { current: 'step' })).toHaveTextContent('Address');
    expect(within(steps).getByRole('link', { name: 'Patient details' })).toBeVisible();

    await press(user, /^Back/);
    expect(await screen.findByRole('textbox', { name: /First name/ })).toHaveValue('Nora');
  });

  it('skips the optional steps and goes to the review, where Edit links go back', async () => {
    const { user, router } = await openNew();
    await fillRequired(user);
    await press(user, 'Skip optional steps and review');

    expect(
      await screen.findByText('Check the details below, then create the patient.'),
    ).toBeVisible();
    expect(router.state.location.search).toMatchObject({ step: 4 });
    expect(screen.getByText('Nora Whitfield')).toBeVisible();
    expect(screen.getByText('15 Mar 1985 (41 y)')).toBeVisible();
    expect(screen.getByText('No address')).toBeVisible();

    await user.click(screen.getByRole('link', { name: 'Edit address' }));
    expect(await screen.findByRole('group', { name: 'Address' })).toBeVisible();
    expect(router.state.location.search).toMatchObject({ step: 2 });
  });

  it('does not offer "Skip" after the first step', async () => {
    const { user } = await openNew();
    await fillRequired(user);
    await press(user, /^Continue/);
    await screen.findByRole('group', { name: 'Address' });
    expect(screen.queryByRole('button', { name: /Skip optional/ })).not.toBeInTheDocument();
  });

  it('validates the address step: line 1 and city are required once any part is filled', async () => {
    const { user } = await openNew();
    await fillRequired(user);
    await press(user, /^Continue/);
    await user.type(await screen.findByRole('textbox', { name: /Address line 2/ }), 'Flat 4');
    await press(user, /^Continue/);
    const summary = await screen.findByRole('alert');
    expect(
      within(summary).getByRole('link', { name: /Address line 1 – Enter the first line/ }),
    ).toBeVisible();
    expect(within(summary).getByRole('link', { name: /City – Enter a city/ })).toBeVisible();
  });

  it('creates the patient, navigates to it and shows a toast', async () => {
    const { user, router } = await openNew();
    await reachReview(user);
    await press(user, 'Create patient');

    expect(await screen.findByRole('heading', { level: 1, name: 'Nora Whitfield' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/patients/99999999-0000-4000-8000-000000000001');
    expect(screen.getByText('Patient created')).toBeVisible();
    // Leaving after a save is not blocked.
    expect(
      screen.queryByRole('alertdialog', { name: 'Leave without saving?' }),
    ).not.toBeInTheDocument();
  });

  it('writes nothing to localStorage or sessionStorage while filling in and saving (ADR 0012)', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { user } = await openNew();
    await reachReview(user);
    await press(user, 'Create patient');
    await screen.findByRole('heading', { level: 1, name: 'Nora Whitfield' });
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
    setItem.mockRestore();
  });

  it('maps a server 422 onto the address step and its summary', async () => {
    server.use(
      http.post('/api/patients', () =>
        problem(422, 'The request is invalid.', {
          errors: [
            { field: 'address.city', message: 'City is not recognised', type: 'value_error' },
          ],
        }),
      ),
    );
    const { user, router } = await openNew();
    await fillRequired(user);
    await press(user, /^Continue/);
    await user.type(await screen.findByRole('textbox', { name: /Address line 1/ }), '1 Main St');
    await user.type(screen.getByRole('textbox', { name: /City/ }), 'Nowhere');
    await press(user, /^Continue/);
    await press(user, /^Continue/);
    await screen.findByText('Check the details below, then create the patient.');
    await press(user, 'Create patient');

    await waitFor(() => expect(router.state.location.search).toMatchObject({ step: 2 }));
    const summary = await screen.findByRole('alert');
    expect(
      within(summary).getByRole('link', { name: 'City – City is not recognised' }),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: /City/ })).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the values on a network failure and a second press creates the patient', async () => {
    server.use(http.post('/api/patients', () => HttpResponse.error()));
    const { user, router } = await openNew();
    await reachReview(user);
    await press(user, 'Create patient');

    expect(
      await screen.findByText(/Couldn't reach the server\. Your details are kept/),
    ).toBeVisible();
    expect(screen.getByText('Nora Whitfield')).toBeVisible();

    server.resetHandlers();
    await press(user, 'Create patient');
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patients\/9999/));
  });

  it('adds tags on Enter, rejects case-insensitive duplicates and removes tags', async () => {
    const { user } = await openNew();
    await fillRequired(user);
    await press(user, /^Continue/);
    await press(user, /^Continue/);
    const input = await screen.findByRole('textbox', { name: /Add allergy/ });
    await user.type(input, 'Peanuts{Enter}');
    expect(screen.getByRole('row', { name: /Peanuts/ })).toBeVisible();
    await user.type(input, 'peanuts{Enter}');
    expect(await screen.findByText('peanuts is already in the list')).toBeVisible();
    // Enter never submits the form or moves to the next step.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Remove Peanuts/ }));
    expect(screen.queryByRole('row', { name: /Peanuts/ })).not.toBeInTheDocument();
  });
});

describe('unsaved-changes guard', () => {
  it('asks before a dirty create form is left, and Keep editing stays', async () => {
    const { user, router } = await openNew();
    await user.type(screen.getByRole('textbox', { name: /First name/ }), 'Nora');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/patients/new');
    expect(screen.getByRole('textbox', { name: /First name/ })).toHaveValue('Nora');
  });

  it('leaves when the user discards the changes', async () => {
    const { user, router } = await openNew();
    await user.type(screen.getByRole('textbox', { name: /First name/ }), 'Nora');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/patients'));
  });

  it('does not ask when nothing was changed', async () => {
    const { user, router } = await openNew();
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/patients'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('guards the edit form as well', async () => {
    const { user, router } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    const first = await screen.findByRole('textbox', { name: /First name/ });
    await user.type(first, 'x');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Leave without saving?' })).toBeVisible();
    expect(router.state.location.pathname).toBe(`/patients/${FIRST_ID}/edit`);
  });
});

describe('edit patient', () => {
  it('lists problems as "Label – message" and focuses the summary', async () => {
    const { user } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    expect(
      await screen.findByText('All fields are required unless marked optional.'),
    ).toBeVisible();
    const email = await screen.findByRole('textbox', { name: /Email/ });
    await user.clear(email);
    await user.type(email, 'ana.terry@');
    await user.type(screen.getByRole('textbox', { name: /Phone/ }), '12345');
    await press(user, 'Save changes');

    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(within(summary).getByRole('heading')).toHaveTextContent(
      '2 problems to fix before you can save',
    );
    expect(
      within(summary).getByRole('link', {
        name: 'Email – Enter an email address with a domain, e.g. name@example.com',
      }),
    ).toBeVisible();
  });

  it('opens a conflict dialog on 412 and can overwrite with the user values', async () => {
    const { user, router } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    const first = await screen.findByRole('textbox', { name: /First name/ });
    expect(first).toHaveValue('David');

    // Someone else saves first.
    db.patients = db.patients.map((p) => (p.id === FIRST_ID ? { ...p, version: 2 } : p));
    await user.clear(first);
    await user.type(first, 'Dave');
    await press(user, 'Save changes');

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Someone else saved this record',
    });
    const load = within(dialog).getByRole('button', { name: 'Load their latest changes' });
    expect(load).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Overwrite with mine' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dave Maldonado' })).toBeVisible();
    expect(router.state.location.pathname).toBe(`/patients/${FIRST_ID}`);
    expect(db.patients.find((p) => p.id === FIRST_ID)?.version).toBe(3);
  });

  it('loads their latest changes into the form', async () => {
    const { user } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    const first = await screen.findByRole('textbox', { name: /First name/ });
    db.patients = db.patients.map((p) =>
      p.id === FIRST_ID ? { ...p, version: 2, first_name: 'Davide' } : p,
    );
    await user.clear(first);
    await user.type(first, 'Dave');
    await press(user, 'Save changes');
    await user.click(await screen.findByRole('button', { name: 'Load their latest changes' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /First name/ })).toHaveValue('Davide'),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the edits and does not show an error when saving while offline', async () => {
    const { user } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    const first = await screen.findByRole('textbox', { name: /First name/ });
    await user.clear(first);
    await user.type(first, 'Dave');
    server.use(http.put(`/api/patients/${FIRST_ID}`, () => HttpResponse.error()));
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await press(user, 'Save changes');
    expect(await screen.findByText(/You’re offline\. Your changes are kept/)).toBeVisible();
    expect(screen.queryByText(/Couldn't reach the server/)).not.toBeInTheDocument();
    expect(first).toHaveValue('Dave');
    online.mockRestore();
  });
});

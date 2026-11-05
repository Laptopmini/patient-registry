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

const submit = (user: UserEvent, name = 'Create patient') =>
  user.click(screen.getByRole('button', { name }));

const openNew = async () => {
  const view = renderWithProviders({ path: '/patients/new' });
  await screen.findByRole('heading', { level: 1, name: 'New patient' });
  return view;
};

describe('patient form (create)', () => {
  it('validates on submit, lists errors as links and focuses the summary', async () => {
    const { user } = await openNew();
    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'nora@');
    await user.type(screen.getByRole('textbox', { name: /Phone/ }), '12345');
    await submit(user);

    const summary = await screen.findByRole('region', { name: /problems?/ });
    await waitFor(() => expect(summary).toHaveFocus());
    expect(
      within(summary).getByRole('link', { name: /First name: Enter a first name/ }),
    ).toBeVisible();
    expect(
      within(summary).getByRole('link', { name: /Date of birth: Enter a date of birth/ }),
    ).toBeVisible();
    expect(
      within(summary).getByRole('link', { name: /Email: Enter an email address/ }),
    ).toBeVisible();
    expect(
      within(summary).getByRole('link', {
        name: /Phone: Enter a phone number in international format/,
      }),
    ).toBeVisible();

    // Each field shows its own error and is marked invalid.
    const first = screen.getByRole('textbox', { name: /First name/ });
    expect(first).toHaveAttribute('aria-invalid', 'true');
    expect(first).toHaveAccessibleDescription(/Enter a first name/);

    // The summary link moves focus to the field.
    await user.click(within(summary).getByRole('link', { name: /First name/ }));
    expect(first).toHaveFocus();
  });

  it('maps a server 422 onto address.city and phone', async () => {
    server.use(
      http.post('/api/patients', () =>
        problem(422, 'The request is invalid.', {
          errors: [
            { field: 'address.city', message: 'City is not recognised', type: 'value_error' },
            { field: 'phone', message: 'Enter a valid phone number', type: 'value_error' },
          ],
        }),
      ),
    );
    const { user } = await openNew();
    await fillRequired(user);
    await user.type(screen.getByRole('textbox', { name: /Address line 1/ }), '1 Main St');
    await user.type(screen.getByRole('textbox', { name: /City/ }), 'Nowhere');
    await user.type(screen.getByRole('textbox', { name: /Phone/ }), '+14155550100');
    await submit(user);

    expect(
      await screen.findByText('City is not recognised', { selector: '[class*=error]' }),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: /City/ })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: /Phone/ })).toHaveAccessibleDescription(
      /Enter a valid phone number/,
    );
    const summary = screen.getByRole('region', { name: /problems?/ });
    expect(
      within(summary).getByRole('link', { name: /City: City is not recognised/ }),
    ).toBeVisible();
    expect(
      within(summary).getByRole('link', { name: /Phone: Enter a valid phone number/ }),
    ).toBeVisible();
  });

  it('keeps the values on a network failure and Retry resubmits', async () => {
    server.use(http.post('/api/patients', () => HttpResponse.error()));
    const { user, router } = await openNew();
    await fillRequired(user);
    await submit(user);

    expect(
      await screen.findByText("Couldn't reach the server. Your changes are kept."),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: /First name/ })).toHaveValue('Nora');
    expect(screen.getByRole('textbox', { name: /Last name/ })).toHaveValue('Whitfield');

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patients\/9999/));
  });

  it('creates the patient, navigates to it and shows a toast', async () => {
    const { user, router } = await openNew();
    await fillRequired(user);
    await submit(user);

    expect(await screen.findByRole('heading', { level: 1, name: 'Nora Whitfield' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/patients/99999999-0000-4000-8000-000000000001');
    expect(screen.getByText('Patient created')).toBeVisible();
  });

  it('adds tags on Enter, rejects case-insensitive duplicates and removes tags', async () => {
    const { user } = await openNew();
    const input = screen.getByRole('textbox', { name: /Add allergy/ });
    await user.type(input, 'Peanuts{Enter}');
    expect(screen.getByRole('row', { name: /Peanuts/ })).toBeVisible();
    await user.type(input, 'peanuts{Enter}');
    expect(await screen.findByText('"peanuts" is already in the list.')).toBeVisible();
    // Enter never submits the form.
    expect(screen.queryByRole('region', { name: /problems?/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Remove Peanuts/ }));
    expect(screen.queryByRole('row', { name: /Peanuts/ })).not.toBeInTheDocument();
  });
});

describe('patient form (edit)', () => {
  it('opens a conflict dialog on 412 and can overwrite with the user values', async () => {
    const { user, router } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    const first = await screen.findByRole('textbox', { name: /First name/ });
    expect(first).toHaveValue('David');

    // Someone else saves first.
    db.patients = db.patients.map((p) => (p.id === FIRST_ID ? { ...p, version: 2 } : p));
    await user.clear(first);
    await user.type(first, 'Dave');
    await submit(user, 'Save changes');

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Reload their version' })).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Overwrite with mine' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dave Maldonado' })).toBeVisible();
    expect(router.state.location.pathname).toBe(`/patients/${FIRST_ID}`);
    expect(db.patients.find((p) => p.id === FIRST_ID)?.version).toBe(3);
  });

  it('reloads their version into the form', async () => {
    const { user } = renderWithProviders({ path: `/patients/${FIRST_ID}/edit` });
    const first = await screen.findByRole('textbox', { name: /First name/ });
    db.patients = db.patients.map((p) =>
      p.id === FIRST_ID ? { ...p, version: 2, first_name: 'Davide' } : p,
    );
    await user.clear(first);
    await user.type(first, 'Dave');
    await submit(user, 'Save changes');
    await user.click(await screen.findByRole('button', { name: 'Reload their version' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /First name/ })).toHaveValue('Davide'),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

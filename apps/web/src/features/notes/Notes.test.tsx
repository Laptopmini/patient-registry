import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { db } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';
import { server } from '../../test/server';

const ID = '00000000-0000-4000-8000-000000000000';

describe('notes tab', () => {
  it('lists notes newest first', async () => {
    renderWithProviders({ path: `/patients/${ID}/notes` });
    await screen.findByText('Seasonal vaccination administered, visit 2.');
    const bodies = screen
      .getAllByText(/Seasonal vaccination administered, visit/)
      .map((el) => el.textContent);
    expect(bodies).toEqual([
      'Seasonal vaccination administered, visit 2.',
      'Seasonal vaccination administered, visit 1.',
    ]);
  });

  it('adds a note optimistically, then clears the form and refocuses the textarea', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`/api/patients/${ID}/notes`, async ({ request }) => {
        await gate;
        const body = (await request.json()) as { body: string; recorded_at: string };
        return HttpResponse.json(
          {
            id: crypto.randomUUID(),
            patient_id: ID,
            created_at: new Date().toISOString(),
            ...body,
          },
          { status: 201 },
        );
      }),
    );
    const { user } = renderWithProviders({ path: `/patients/${ID}/notes` });
    const textarea = await screen.findByRole('textbox', { name: 'Note' });
    await user.type(textarea, 'Follow-up call completed');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    // Visible immediately, marked as saving, and the text stays until the server confirms.
    expect(await screen.findByText('Follow-up call completed', { selector: 'p' })).toBeVisible();
    expect(screen.getByText('Saving…')).toBeVisible();
    expect(textarea).toHaveValue('Follow-up call completed');

    release();
    await waitFor(() => expect(textarea).toHaveValue(''));
    expect(textarea).toHaveFocus();
  });

  it('keeps the text and offers Retry when saving fails', async () => {
    server.use(http.post(`/api/patients/${ID}/notes`, () => HttpResponse.error()));
    const { user } = renderWithProviders({ path: `/patients/${ID}/notes` });
    const textarea = await screen.findByRole('textbox', { name: 'Note' });
    await user.type(textarea, 'Important detail');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByText("We couldn't save this note.")).toBeVisible();
    expect(textarea).toHaveValue('Important detail');
    // The optimistic note was rolled back.
    expect(screen.queryByText('Important detail', { selector: 'p' })).not.toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(textarea).toHaveValue(''));
    expect(await screen.findByText('Important detail', { selector: 'p' })).toBeVisible();
  });

  it('asks for confirmation before deleting, then removes the note and shows a toast', async () => {
    const { user } = renderWithProviders({ path: `/patients/${ID}/notes` });
    const buttons = await screen.findAllByRole('button', { name: /Delete note from/ });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0] as HTMLElement);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete this note?')).toBeVisible();
    expect(db.notes.get(ID)).toHaveLength(2); // nothing deleted yet
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(db.notes.get(ID)).toHaveLength(2);

    await user.click(
      (await screen.findAllByRole('button', { name: /Delete note from/ }))[0] as HTMLElement,
    );
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete note' }),
    );
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Delete note from/ })).toHaveLength(1),
    );
    expect(await screen.findByText('Note deleted')).toBeVisible();
    await waitFor(() => expect(db.notes.get(ID)).toHaveLength(1));
  });

  it('truncates long notes with Show more', async () => {
    db.notes.set(ID, [
      {
        ...(db.notes.get(ID)?.[0] as NonNullable<ReturnType<typeof db.notes.get>>[number]),
        body: 'x'.repeat(900),
      },
    ]);
    const { user } = renderWithProviders({ path: `/patients/${ID}/notes` });
    const more = await screen.findByRole('button', { name: 'Show more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

describe('summary tab', () => {
  it('shows the provenance label, facts, narrative paragraphs and note count', async () => {
    renderWithProviders({ path: `/patients/${ID}/summary` });
    expect(await screen.findByText('Generated from a template')).toBeVisible();
    expect(screen.getByText('First paragraph of the narrative.')).toBeVisible();
    expect(screen.getByText('Second paragraph of the narrative.')).toBeVisible();
    expect(screen.getByText(/Based on 2 notes/)).toBeVisible();
    expect(screen.getAllByText('Penicillin').length).toBeGreaterThan(0);
  });

  it('labels AI summaries', async () => {
    server.use(
      http.get(`/api/patients/${ID}/summary`, () =>
        HttpResponse.json({
          patient_id: ID,
          name: 'David Maldonado',
          age: 79,
          blood_type: 'O+',
          conditions: [],
          allergies: [],
          narrative: 'Text.',
          provider: 'anthropic',
          note_count: 1,
          generated_at: '2026-11-05T10:00:00+00:00',
        }),
      ),
    );
    renderWithProviders({ path: `/patients/${ID}/summary` });
    expect(await screen.findByText('AI-generated, verify before clinical use')).toBeVisible();
    expect(screen.getByText(/Based on 1 note ·/)).toBeVisible();
  });
});

describe('patient detail', () => {
  it('shows the allergy strip, route-based tabs and a not-found page for unknown patients', async () => {
    const { user, router } = renderWithProviders({ path: `/patients/${ID}` });
    expect(await screen.findByRole('heading', { level: 1, name: 'David Maldonado' })).toBeVisible();
    expect(screen.getByRole('region', { name: /^Allergies/ })).toHaveTextContent('Penicillin');
    await user.click(screen.getByRole('tab', { name: /^Notes/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/patients/${ID}/notes`));
    expect(screen.getByRole('tab', { name: /^Notes/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders Not found inside the shell for an unknown patient', async () => {
    renderWithProviders({ path: '/patients/00000000-0000-4000-8000-0000000000ff' });
    expect(
      await screen.findByRole('heading', { level: 1, name: "We can't find that page" }),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to patients' })).toBeVisible();
  });

  it('archives with confirmation, navigates to the list and shows a toast', async () => {
    const { user, router } = renderWithProviders({ path: `/patients/${ID}` });
    await user.click(await screen.findByRole('button', { name: 'Archive patient' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Archive patient' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/patients'));
    expect(await screen.findByText('Patient archived')).toBeVisible();
    expect(db.patients.some((p) => p.id === ID)).toBe(false);
  });
});

describe('dashboard', () => {
  it('shows counts and recently seen, and quick search navigates to the list', async () => {
    const { user, router } = renderWithProviders({ path: '/' });
    expect(await screen.findByText('45')).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Recently seen' })).toBeVisible();
    await user.type(screen.getByRole('textbox', { name: /Search patients/ }), 'chen{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/patients'));
    expect(router.state.location.search).toMatchObject({ q: 'chen' });
  });
});

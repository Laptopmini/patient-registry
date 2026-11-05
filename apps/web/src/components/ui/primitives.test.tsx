import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllergyStrip } from './AllergyStrip';
import { Button } from './Button';
import { CountPill } from './CountPill';
import { EmptyState } from './EmptyState';
import { ErrorSummary } from './ErrorSummary';
import { Pagination } from './Pagination';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('shows the status as text, not colour alone', () => {
    render(<StatusBadge status="follow_up" />);
    expect(screen.getByText('Follow-up')).toBeVisible();
  });
});

describe('AllergyStrip', () => {
  it('lists allergies with a count pill', () => {
    render(<AllergyStrip allergies={['Peanuts', 'Codeine']} />);
    const strip = screen.getByRole('region', { name: /Allergies/ });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(2);
    expect(within(strip).getByText('2')).toBeVisible();
  });

  it('says "No known allergies" instead of hiding', () => {
    render(<AllergyStrip allergies={[]} />);
    expect(screen.getByRole('region', { name: 'No known allergies' })).toBeVisible();
  });
});

describe('CountPill', () => {
  it('can carry its own accessible name', () => {
    render(<CountPill count={6} label="6 notes" />);
    expect(screen.getByRole('img', { name: '6 notes' })).toBeVisible();
  });
});

describe('Pagination', () => {
  it('summarises the range and disables the ends', () => {
    render(
      <Pagination page={1} totalPages={2} total={20} pageSize={10} hrefFor={(p) => `?p=${p}`} />,
    );
    expect(screen.getByText('Showing 1–10 of 20')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '?p=2');
    expect(screen.queryByRole('link', { name: 'Previous' })).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('announces errors', () => {
    render(<EmptyState tone="error" title="We couldn't load patients" />);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load patients");
  });
});

describe('ErrorSummary', () => {
  it('writes each item as bold label, dash, message', () => {
    render(
      <ErrorSummary items={[{ fieldId: 'email', label: 'Email', message: 'Enter an email' }]} />,
    );
    expect(screen.getByRole('link')).toHaveTextContent('Email – Enter an email');
    expect(screen.getByText('Email').tagName).toBe('STRONG');
    expect(screen.getByRole('heading')).toHaveTextContent('1 problem to fix before you can save');
  });
});

describe('Button', () => {
  it('keeps pending buttons inert and presses otherwise', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Button onPress={onPress}>Save</Button>);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(
      <Button isPending onPress={onPress}>
        Saving…
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

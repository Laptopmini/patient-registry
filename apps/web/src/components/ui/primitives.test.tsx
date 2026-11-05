import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutProvider } from '../../lib/layout';
import { AllergyStrip } from './AllergyStrip';
import { Button } from './Button';
import { CountPill } from './CountPill';
import { EmptyState } from './EmptyState';
import { ErrorSummary } from './ErrorSummary';
import { OfflineDataBadge } from './OfflineDataBadge';
import { Pagination } from './Pagination';
import { StatusBadge } from './StatusBadge';
import { Stepper } from './Stepper';

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

describe('ErrorSummary focus', () => {
  it('moves focus to the field, or the first control inside it', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ErrorSummary
          items={[{ fieldId: 'field-email', label: 'Email', message: 'Enter an email' }]}
        />
        <div id="field-email">
          <input aria-label="Email" />
        </div>
      </>,
    );
    await user.click(screen.getByRole('link'));
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  });
});

describe('Stepper', () => {
  const steps = [
    { label: 'Patient details', hint: 'Required', href: '?step=1', done: true },
    { label: 'Address', hint: 'Optional', href: '?step=2', done: false },
    { label: 'Medical', hint: 'Optional', href: '?step=3', done: false },
    { label: 'Review', hint: 'Check and create', href: '?step=4', done: false },
  ];

  it('marks the current step, links finished steps and leaves the rest as text', () => {
    render(<Stepper label="Steps to create a patient" steps={steps} current={2} />);
    const list = screen.getByRole('list', { name: 'Steps to create a patient' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(within(list).getByRole('listitem', { current: 'step' })).toHaveTextContent('Address');
    expect(within(list).getByRole('link', { name: 'Patient details' })).toHaveAttribute(
      'href',
      '?step=1',
    );
    expect(within(list).queryByRole('link', { name: 'Medical' })).not.toBeInTheDocument();
  });

  it('collapses to "Step 2 of 4" with a progress bar on compact', () => {
    render(
      <LayoutProvider layout="compact">
        <Stepper label="Steps to create a patient" steps={steps} current={2} />
      </LayoutProvider>,
    );
    expect(screen.getByText('Step 2 of 4')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Step 2 of 4');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('OfflineDataBadge', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows "Showing data from HH:MM" only while offline', () => {
    const updatedAt = new Date(2026, 10, 5, 13, 2).getTime();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { rerender } = render(<OfflineDataBadge updatedAt={updatedAt} />);
    expect(screen.queryByText(/Showing data from/)).not.toBeInTheDocument();
    online.mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    rerender(<OfflineDataBadge updatedAt={updatedAt} />);
    expect(screen.getByText(/Showing data from 13:02|Showing data from 1:02/)).toBeVisible();
  });
});

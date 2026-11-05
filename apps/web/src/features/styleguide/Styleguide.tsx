import { Archive, Pencil, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { type PatientStatus, SortField } from '../../api/generated/model';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { AllergyStrip } from '../../components/ui/AllergyStrip';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button, buttonClass } from '../../components/ui/Button';
import { ComboBoxField } from '../../components/ui/ComboBoxField';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CountPill } from '../../components/ui/CountPill';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { Disclosure } from '../../components/ui/Disclosure';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorSummary } from '../../components/ui/ErrorSummary';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { Pagination } from '../../components/ui/Pagination';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { RadioCards } from '../../components/ui/RadioCards';
import { SearchField } from '../../components/ui/SearchField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SelectField } from '../../components/ui/SelectField';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TagInput } from '../../components/ui/TagInput';
import { TextField } from '../../components/ui/TextField';
import { TimeFieldInput } from '../../components/ui/TimeFieldInput';
import { Tooltip } from '../../components/ui/Tooltip';
import { showToast } from '../../lib/toast';
import { usePageTitle } from '../../lib/usePageTitle';
import styles from './Styleguide.module.css';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  return (
    <section className={styles.section} aria-labelledby={`sg-${slug}`}>
      <h2 id={`sg-${slug}`}>{title}</h2>
      <div className={styles.row}>{children}</div>
    </section>
  );
}

function Sample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.sample}>
      <p className={styles.sampleLabel}>{label}</p>
      {children}
    </div>
  );
}

const STATUSES: PatientStatus[] = ['active', 'follow_up', 'inactive'];

const SORTS = [
  { id: SortField.last_name, label: 'Name, A–Z' },
  { id: SortField['-last_visit'], label: 'Last visit, newest first' },
];

/** Dev-only gallery of every component state in design/handoff/components.md. */
export default function Styleguide() {
  usePageTitle('Styleguide');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'all' | PatientStatus>('all');
  const [radio, setRadio] = useState<PatientStatus>('active');
  const [sort, setSort] = useState<SortField>(SortField.last_name);
  const [allergies, setAllergies] = useState(['Peanuts', 'Codeine']);
  const [conditions, setConditions] = useState(['Migraine']);
  const [combo, setCombo] = useState('');
  const [dialog, setDialog] = useState(false);

  return (
    <>
      <h1 tabIndex={-1}>Styleguide</h1>
      <p className={styles.note}>
        Development only: this route is not part of production builds. Every state in the component
        inventory is shown here.
      </p>

      <Section title="Buttons">
        <Sample label="Primary, secondary, danger outline, danger solid">
          <div className={styles.inline}>
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="danger">
              <Archive />
              Archive patient
            </Button>
            <Button variant="dangerSolid">Delete note</Button>
          </div>
        </Sample>
        <Sample label="Disabled and pending">
          <div className={styles.inline}>
            <Button variant="primary" isDisabled>
              Disabled
            </Button>
            <Button isDisabled>Disabled</Button>
            <Button variant="primary" isPending>
              Saving…
            </Button>
          </div>
        </Sample>
        <Sample label="Quiet icon, small, text link button, link styled as button">
          <div className={styles.inline}>
            <Button variant="quiet" aria-label="Edit">
              <Pencil />
            </Button>
            <Button variant="quiet" danger aria-label="Delete">
              <Trash2 />
            </Button>
            <Button small>Small</Button>
            <Button variant="link">Skip optional steps and review</Button>
            <a href="#sg-buttons" className={buttonClass('primary')}>
              <Plus />
              New patient
            </a>
          </div>
        </Sample>
        <Sample label="Breadcrumbs">
          <Breadcrumbs items={[{ label: 'Patients', href: '/patients' }, { label: 'Ana Terry' }]} />
        </Sample>
      </Section>

      <Section title="Inputs">
        <Sample label="Text field: default, with description">
          <TextField label="First name" description="As on their ID" />
        </Sample>
        <Sample label="Text field: invalid">
          <TextField
            label="Email"
            error="Enter an email address with a domain, e.g. name@example.com"
          />
        </Sample>
        <Sample label="Text field: disabled, optional">
          <TextField label="Address line 2" optional isDisabled />
        </Sample>
        <Sample label="Text area with counter near the limit">
          <TextField
            label="Note"
            multiline
            footer="4,912 / 5,000"
            footerTone="danger"
            defaultValue="Plain text"
          />
        </Sample>
        <Sample label="Search field">
          <SearchField label="Search patients" value={search} onChange={setSearch} />
        </Sample>
        <Sample label="Combobox (empty list message)">
          <ComboBoxField
            label="Find a patient"
            items={[]}
            inputValue={combo}
            onInputChange={setCombo}
            onSelect={() => {}}
            textValue={() => ''}
            renderItem={() => null}
            emptyText={`No patients match '${combo}'`}
          />
        </Sample>
        <Sample label="Select">
          <SelectField label="Sort by" options={SORTS} value={sort} onChange={setSort} />
        </Sample>
        <Sample label="Date picker and time field">
          <div className={styles.inline}>
            <DatePickerField label="Clinical date" value={null} onChange={() => {}} />
            <TimeFieldInput label="Time" value={null} onChange={() => {}} />
          </div>
        </Sample>
        <Sample label="Status radio cards">
          <RadioCards
            label="Status"
            value={radio}
            onChange={setRadio}
            options={STATUSES.map((id) => ({ id, label: id }))}
          />
        </Sample>
        <Sample label="Tag input: allergies and conditions">
          <div className={styles.stack}>
            <TagInput
              label="Allergies"
              noun="allergy"
              fieldName="sg-allergies"
              tone="allergy"
              values={allergies}
              onChange={setAllergies}
            />
            <TagInput
              label="Conditions"
              noun="condition"
              fieldName="sg-conditions"
              tone="condition"
              values={conditions}
              onChange={setConditions}
            />
          </div>
        </Sample>
        <Sample label="Segmented control">
          <SegmentedControl
            label="Filter by status"
            value={segment}
            onChange={setSegment}
            segments={[
              { id: 'all', label: 'All', count: 20 },
              { id: 'active', label: 'Active', count: 13 },
              { id: 'follow_up', label: 'Follow-up', count: 3 },
              { id: 'inactive', label: 'Inactive', count: 4 },
            ]}
          />
        </Sample>
      </Section>

      <Section title="Data display">
        <Sample label="Status badges">
          <div className={styles.inline}>
            {STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Sample>
        <Sample label="Count pills">
          <div className={styles.inline}>
            <CountPill count={3} tone="allergy" />
            <CountPill count={6} label="6 notes" />
          </div>
        </Sample>
        <Sample label="Allergy strip: with allergies and none">
          <div className={styles.stack}>
            <AllergyStrip allergies={['Peanuts', 'Codeine', 'Pollen']} />
            <AllergyStrip allergies={[]} />
          </div>
        </Sample>
        <Sample label="Skeleton">
          <div className={styles.stack}>
            <Skeleton width="60%" />
            <Skeleton height="28px" width="140px" pill />
          </div>
        </Sample>
        <Sample label="Pagination">
          <Pagination
            page={2}
            totalPages={5}
            total={100}
            pageSize={20}
            hrefFor={() => '#sg-data'}
          />
        </Sample>
      </Section>

      <Section title="Feedback">
        <Sample label="Empty and error states">
          <div className={styles.stack}>
            <EmptyState
              title="No matches for 'smi'"
              action={<Button variant="primary">Clear search and filters</Button>}
            >
              Try a different spelling, or remove a filter.
            </EmptyState>
            <EmptyState
              tone="error"
              title="We couldn't load patients"
              action={<Button variant="primary">Retry</Button>}
            />
          </div>
        </Sample>
        <Sample label="Error summary">
          <ErrorSummary
            items={[
              {
                fieldId: 'sg-allergies',
                label: 'Email',
                message: 'Enter an email address with a domain',
              },
              {
                fieldId: 'sg-allergies',
                label: 'Phone',
                message: 'Enter a phone number in international format',
              },
            ]}
          />
        </Sample>
        <Sample label="Offline banner">
          <div className={styles.stack}>
            <OfflineBanner state="offline" onRetry={() => {}} />
            <OfflineBanner state="offline" isRetrying onRetry={() => {}} />
            <OfflineBanner state="online" onRetry={() => {}} />
          </div>
        </Sample>
        <Sample label="Progress: determinate, indeterminate, refetch bar">
          <div className={styles.stack}>
            <ProgressBar label="Step 1 of 4" value={25} valueText="Step 1 of 4" showLabel />
            <ProgressBar label="Loading" />
            <ProgressBar label="Updating results" size="thin" />
          </div>
        </Sample>
        <Sample label="Toasts">
          <div className={styles.inline}>
            <Button onPress={() => showToast('Changes saved')}>Success toast</Button>
            <Button onPress={() => showToast("We couldn't delete the note. Try again.", 'error')}>
              Failure toast
            </Button>
          </div>
        </Sample>
      </Section>

      <Section title="Overlays">
        <Sample label="Confirm dialog">
          <Button variant="danger" onPress={() => setDialog(true)}>
            Delete note…
          </Button>
          <ConfirmDialog
            isOpen={dialog}
            onOpenChange={setDialog}
            title="Delete this note?"
            confirmLabel="Delete note"
            destructive
            onConfirm={() => setDialog(false)}
          >
            <p>This can't be undone.</p>
          </ConfirmDialog>
        </Sample>
        <Sample label="Menu and tooltip">
          <div className={styles.inline}>
            <ActionMenu
              label="More actions for Martinez, Deborah"
              onAction={() => {}}
              items={[
                { id: 'open', label: 'Open' },
                { id: 'edit', label: 'Edit', icon: <Pencil /> },
                { id: 'archive', label: 'Archive patient…', icon: <Archive />, danger: true },
              ]}
            />
            <Tooltip text="Not available offline" placement="bottom">
              <Button isDisabled>Save</Button>
            </Tooltip>
          </div>
        </Sample>
        <Sample label="Disclosure">
          <Disclosure title="Tips for this step">
            <p>Use the name on their ID.</p>
          </Disclosure>
        </Sample>
      </Section>
    </>
  );
}

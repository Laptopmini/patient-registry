import { keepPreviousData } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useDeferredValue, useEffect, useState } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { useListPatients } from '../../../api/generated/client';
import { type PatientStatus, SortField } from '../../../api/generated/model';
import { unwrap } from '../../../api/unwrap';
import { Button, buttonClass } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField } from '../../../components/ui/TextField';
import { STATUS_LABELS } from '../../../lib/format';
import { useIsWide } from '../../../lib/useMediaQuery';
import { PAGE_SIZE, toListParams } from './listSearch';
import { Pagination } from './Pagination';
import { PatientCards } from './PatientCards';
import styles from './PatientList.module.css';
import { PatientTable } from './PatientTable';

const route = getRouteApi('/patients/');

const SEARCH_DEBOUNCE_MS = 250;

const SORT_OPTIONS: SelectOption<SortField>[] = [
  { id: SortField.last_name, label: 'Last name, A to Z' },
  { id: SortField['-last_name'], label: 'Last name, Z to A' },
  { id: SortField.age, label: 'Age, youngest first' },
  { id: SortField['-age'], label: 'Age, oldest first' },
  { id: SortField['-last_visit'], label: 'Last visit, newest first' },
  { id: SortField.last_visit, label: 'Last visit, oldest first' },
  { id: SortField['-created_at'], label: 'Recently added' },
];

const STATUS_KEYS = ['all', 'active', 'follow_up', 'inactive'] as const;

function SearchBox() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const urlQ = search.q ?? '';

  // `input` is local so typing never waits on the router or the network. A debounce
  // copies it to the URL; `committed` remembers what we last wrote.
  const [input, setInput] = useState(urlQ);
  const [committed, setCommitted] = useState(urlQ);
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);

  // The URL changed from elsewhere (Clear, back/forward): adopt it.
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    if (urlQ !== committed) {
      setInput(urlQ);
      setCommitted(urlQ);
    }
  }

  useEffect(() => {
    if (input === committed) return;
    const timer = setTimeout(() => {
      setCommitted(input);
      const q = input.trim();
      void navigate({
        search: (prev) => ({ ...prev, q: q || undefined, page: undefined }),
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, committed, navigate]);

  return (
    <div className={styles.searchField}>
      <TextField
        label="Search patients"
        description="By name, email or phone"
        type="search"
        value={input}
        onChange={setInput}
        autoComplete="off"
      />
    </div>
  );
}

function StatusFilter({ status }: { status: PatientStatus | undefined }) {
  const navigate = route.useNavigate();
  return (
    <ToggleButtonGroup
      aria-label="Filter by status"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[status ?? 'all']}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        const next = STATUS_KEYS.find((k) => k === key);
        if (!next) return;
        void navigate({
          search: (prev) => ({
            ...prev,
            status: next === 'all' ? undefined : next,
            page: undefined,
          }),
        });
      }}
      className={styles.statusGroup}
    >
      <ToggleButton id="all" className={styles.toggle}>
        All
      </ToggleButton>
      {(['active', 'follow_up', 'inactive'] as const).map((s) => (
        <ToggleButton key={s} id={s} className={styles.toggle}>
          {STATUS_LABELS[s]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function PatientListPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const isWide = useIsWide();

  // The query key follows a deferred copy of the URL state, so the input stays responsive.
  const deferredSearch = useDeferredValue(search);
  const { data, isError, isPending, isPlaceholderData, refetch } = useListPatients(
    toListParams(deferredSearch),
    { query: { placeholderData: keepPreviousData, select: unwrap } },
  );
  const isUpdating = isPlaceholderData || deferredSearch !== search;

  const hasFilters = Boolean(search.q || search.status);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const setSort = (sort: SortField) =>
    void navigate({ search: (prev) => ({ ...prev, sort, page: undefined }) });

  const clear = () => void navigate({ search: {} });

  return (
    <>
      <h1 tabIndex={-1}>Patients</h1>

      <div className={styles.toolbar}>
        <SearchBox />
        <div>
          <span id="status-filter-label" className={styles.statusLabel}>
            Status
          </span>
          <StatusFilter status={search.status} />
        </div>
        {!isWide && (
          <div className={styles.sortSelect}>
            <SelectField
              label="Sort by"
              options={SORT_OPTIONS}
              value={search.sort}
              onChange={setSort}
            />
          </div>
        )}
      </div>

      <div className={styles.resultsHeader}>
        {/* Polite live region: the result count is announced after each update. */}
        <p role="status" className={styles.count}>
          {data ? `${data.total} ${data.total === 1 ? 'patient' : 'patients'}` : ''}
        </p>
        <span className={styles.updating} aria-hidden={!isUpdating}>
          {isUpdating && !isPending ? 'Updating results…' : ''}
        </span>
      </div>

      {isError && (
        <ErrorState message="We couldn't load patients." onRetry={() => void refetch()} />
      )}

      {isPending && !isError && <p>Loading patients…</p>}

      {data && (
        <div className={styles.results} data-stale={isUpdating}>
          {data.items.length === 0 ? (
            <EmptyState query={search.q} hasFilters={hasFilters} onClear={clear} />
          ) : isWide ? (
            <PatientTable items={data.items} sort={search.sort} onSortChange={setSort} />
          ) : (
            <PatientCards items={data.items} />
          )}
          <Pagination page={search.page} totalPages={totalPages} />
        </div>
      )}
    </>
  );
}

function EmptyState({
  query,
  hasFilters,
  onClear,
}: {
  query: string | undefined;
  hasFilters: boolean;
  onClear: () => void;
}) {
  if (!hasFilters) {
    return (
      <div className={styles.empty}>
        <h2>No patients yet</h2>
        <p>Add the first patient to get started.</p>
        <Link to="/patients/new" className={buttonClass('primary')}>
          New patient
        </Link>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <h2>{query ? `No matches for "${query}"` : 'No patients match these filters'}</h2>
      <p>Try a different spelling, or remove a filter.</p>
      <Button variant="primary" onPress={onClear}>
        Clear search and filters
      </Button>
    </div>
  );
}

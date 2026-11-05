import { keepPreviousData } from '@tanstack/react-query';
import { getRouteApi, Link, useRouter } from '@tanstack/react-router';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { useListPatients } from '../../../api/generated/client';
import {
  type ListPatientsParams,
  type PatientListItem,
  type PatientStatus,
  SortField,
} from '../../../api/generated/model';
import { unwrap } from '../../../api/unwrap';
import { Button, buttonClass } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { OfflineDataBadge } from '../../../components/ui/OfflineDataBadge';
import { Pagination } from '../../../components/ui/Pagination';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { SearchField } from '../../../components/ui/SearchField';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { Skeleton } from '../../../components/ui/Skeleton';
import { STATUS_LABELS } from '../../../lib/format';
import { useLayout } from '../../../lib/layout';
import { usePageTitle } from '../../../lib/usePageTitle';
import { useTransitioned } from '../../../lib/viewTransition';
import { ArchiveDialog } from '../ArchiveDialog';
import { useArchivePatient } from '../useArchivePatient';
import { PAGE_SIZE, toListParams } from './listSearch';
import { PatientCards } from './PatientCards';
import styles from './PatientList.module.css';
import { PatientTable } from './PatientTable';

const route = getRouteApi('/patients/');

const SEARCH_DEBOUNCE_MS = 250;

const SORT_OPTIONS: SelectOption<SortField>[] = [
  { id: SortField.last_name, label: 'Name, A–Z' },
  { id: SortField['-last_name'], label: 'Name, Z–A' },
  { id: SortField.age, label: 'Age, youngest first' },
  { id: SortField['-age'], label: 'Age, oldest first' },
  { id: SortField['-last_visit'], label: 'Last visit, newest first' },
  { id: SortField.last_visit, label: 'Last visit, oldest first' },
  { id: SortField['-created_at'], label: 'Recently added' },
];

type StatusKey = 'all' | PatientStatus;
const STATUS_KEYS: StatusKey[] = ['all', 'active', 'follow_up', 'inactive'];
const statusLabel = (key: StatusKey) => (key === 'all' ? 'All' : STATUS_LABELS[key]);

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

  return <SearchField label="Search patients" value={input} onChange={setInput} />;
}

/** The number of patients with a status (or all), for the current search. One cached `limit=1` query each. */
function useStatusCount(q: string | undefined, status: StatusKey) {
  const params: ListPatientsParams = {
    ...(q ? { q } : {}),
    ...(status === 'all' ? {} : { status }),
    limit: 1,
  };
  const { data } = useListPatients(params, {
    query: { placeholderData: keepPreviousData, select: unwrap },
  });
  return data?.total;
}

function useStatusCounts(q: string | undefined) {
  return {
    all: useStatusCount(q, 'all'),
    active: useStatusCount(q, 'active'),
    follow_up: useStatusCount(q, 'follow_up'),
    inactive: useStatusCount(q, 'inactive'),
  } satisfies Record<StatusKey, number | undefined>;
}

function ListSkeleton({ compact }: { compact: boolean }) {
  return (
    <div aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading patients…
      </p>
      {compact ? (
        <div className={styles.skeletonList}>
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <div key={i} className={styles.skeletonCard}>
              <Skeleton width="55%" height="24px" />
              <Skeleton width="40%" />
              <Skeleton width="70%" height="28px" pill />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.skeletonHeader} />
          {Array.from({ length: 10 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <div key={i} className={styles.skeletonRow}>
              <Skeleton width="70%" />
              <Skeleton width="50%" />
              <Skeleton width="60%" />
              <Skeleton width="90px" height="28px" pill />
              <Skeleton width="24px" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientListPage() {
  usePageTitle('Patients');
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const router = useRouter();
  const layout = useLayout();
  const compact = layout === 'compact';
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The query key follows a deferred copy of the URL state, so the input stays responsive.
  const deferredSearch = useDeferredValue(search);
  const {
    data: latest,
    dataUpdatedAt,
    isError,
    isPending,
    isPlaceholderData,
    refetch,
  } = useListPatients(toListParams(deferredSearch), {
    query: { placeholderData: keepPreviousData, select: unwrap },
  });
  // New results cross-fade in (a View Transition), unless the user prefers no motion.
  const data = useTransitioned(latest);
  const isUpdating = isPlaceholderData || deferredSearch !== search;
  const counts = useStatusCounts(deferredSearch.q);

  const [toArchive, setToArchive] = useState<PatientListItem | null>(null);
  const archive = useArchivePatient({
    onArchived: () => {
      setToArchive(null);
      headingRef.current?.focus();
    },
  });

  const hasFilters = Boolean(search.q || search.status);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hrefForPage = (page: number) =>
    router.buildLocation({ to: '/patients', search: { ...search, page } }).href;

  const setSort = (sort: SortField) =>
    void navigate({ search: (prev) => ({ ...prev, sort, page: undefined }) });
  const setStatus = (key: StatusKey) =>
    void navigate({
      search: (prev) => ({ ...prev, status: key === 'all' ? undefined : key, page: undefined }),
    });
  const open = (patientId: string) =>
    void navigate({ to: '/patients/$patientId', params: { patientId } });
  const clear = () => void navigate({ search: {} });

  const currentStatus: StatusKey = search.status ?? 'all';
  const statusOptions = STATUS_KEYS.map((key) => ({ id: key, label: statusLabel(key) }));

  return (
    <>
      <div className={styles.titleRow}>
        <h1 ref={headingRef} tabIndex={-1}>
          Patients
        </h1>
        <OfflineDataBadge updatedAt={dataUpdatedAt} />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchBox />
        </div>
        <div className={styles.filters}>
          {compact ? (
            <div className={styles.selects}>
              <SelectField
                label="Status"
                options={statusOptions}
                value={currentStatus}
                onChange={setStatus}
              />
              <SelectField
                label="Sort by"
                options={SORT_OPTIONS}
                value={search.sort}
                onChange={setSort}
              />
            </div>
          ) : (
            <div className={styles.statusFilter}>
              <span className={styles.fieldLabel}>Status</span>
              <SegmentedControl
                label="Filter by status"
                value={currentStatus}
                onChange={setStatus}
                segments={STATUS_KEYS.map((key) => ({
                  id: key,
                  label: statusLabel(key),
                  count: counts[key] ?? '…',
                }))}
              />
            </div>
          )}
          {/* Polite live region: the result count is announced after each update. */}
          <p role="status" className={styles.count}>
            {data && (
              <>
                <strong>{data.total}</strong> {data.total === 1 ? 'patient' : 'patients'}
              </>
            )}
          </p>
        </div>
      </div>

      <div className={styles.results} data-stale={isUpdating}>
        <div className={styles.refetch}>
          {isUpdating && !isPending && <ProgressBar label="Updating results" size="thin" />}
        </div>
        <span className={styles.updatingText} role="status">
          {isUpdating && !isPending ? 'Updating results…' : ''}
        </span>

        {isError && !data && (
          <div className={styles.tableCard}>
            <EmptyState
              tone="error"
              title="We couldn't load patients"
              action={
                <Button variant="primary" onPress={() => void refetch()}>
                  Retry
                </Button>
              }
            >
              Check your connection and try again. Your search and filters are kept.
            </EmptyState>
          </div>
        )}

        {isPending && !isError && <ListSkeleton compact={compact} />}

        {data &&
          (data.items.length === 0 ? (
            <div className={styles.tableCard}>
              <ListEmpty query={search.q} hasFilters={hasFilters} onClear={clear} />
            </div>
          ) : compact ? (
            <>
              <PatientCards items={data.items} />
              <Pagination
                page={search.page}
                totalPages={totalPages}
                total={data.total}
                pageSize={PAGE_SIZE}
                hrefFor={hrefForPage}
              />
            </>
          ) : (
            <div className={styles.tableCard}>
              <PatientTable
                items={data.items}
                sort={search.sort}
                onSortChange={setSort}
                onOpen={open}
                onArchive={setToArchive}
              />
              <div className={styles.footer}>
                <Pagination
                  page={search.page}
                  totalPages={totalPages}
                  total={data.total}
                  pageSize={PAGE_SIZE}
                  hrefFor={hrefForPage}
                />
              </div>
            </div>
          ))}
      </div>

      <ArchiveDialog
        name={toArchive ? `${toArchive.first_name} ${toArchive.last_name}` : 'this patient'}
        isOpen={toArchive !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setToArchive(null);
        }}
        isPending={archive.isPending}
        onConfirm={() => toArchive && archive.mutate({ id: toArchive.id })}
      />
    </>
  );
}

function ListEmpty({
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
      <EmptyState
        title="No patients yet"
        action={
          <Link to="/patients/new" className={buttonClass('primary')}>
            Add the first patient
          </Link>
        }
      >
        Patients you add will show up here.
      </EmptyState>
    );
  }
  return (
    <EmptyState
      title={query ? `No matches for '${query}'` : 'No patients match these filters'}
      action={
        <Button variant="primary" onPress={onClear}>
          Clear search and filters
        </Button>
      }
    >
      Try a different spelling, or remove a filter.
    </EmptyState>
  );
}

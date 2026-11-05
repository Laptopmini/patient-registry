import { Link } from '@tanstack/react-router';
import { CircleCheck, CircleMinus, Clock, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { GridList, GridListItem } from 'react-aria-components';
import { useListPatients } from '../../api/generated/client';
import type { PatientStatus } from '../../api/generated/model';
import { unwrap } from '../../api/unwrap';
import { PatientSearchBoundary } from '../../components/shell/PatientSearchBoundary';
import { Button, buttonClass } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { OfflineDataBadge } from '../../components/ui/OfflineDataBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatAge, formatLastVisit, formatLongDate, listName } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import styles from './DashboardPage.module.css';
import { countParams, recentParams } from './queries';

export const greeting = (now: Date) => {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

interface StatCardProps {
  label: string;
  icon: ReactNode;
  status?: PatientStatus;
}

/** A card that links to the list filtered by this status; the number is its total. */
function StatCard({ label, icon, status }: StatCardProps) {
  const { data, isError, isPending } = useListPatients(countParams(status), {
    query: { select: unwrap },
  });
  return (
    <li>
      <Link
        to="/patients"
        {...(status ? { search: { status } } : {})}
        className={`${styles.stat} ${status ? styles[status] : ''}`}
      >
        <span className={styles.statLabel}>
          {icon}
          {label}
        </span>
        <span className={styles.statNumber}>
          {isPending ? (
            <Skeleton width="48px" height="36px" />
          ) : isError ? (
            <>
              <span aria-hidden="true">–</span>
              <span className="visually-hidden">Unavailable</span>
            </>
          ) : (
            data.total
          )}
        </span>
      </Link>
    </li>
  );
}

function RecentList() {
  const { data, isError, isPending, refetch } = useListPatients(recentParams, {
    query: { select: unwrap },
  });

  if (isError) {
    return (
      <EmptyState
        tone="error"
        headingLevel={3}
        title="We couldn't load recently seen patients"
        action={
          <Button variant="primary" onPress={() => void refetch()}>
            Retry
          </Button>
        }
      >
        Check your connection and try again.
      </EmptyState>
    );
  }
  if (isPending) {
    return (
      <div aria-busy="true">
        <p role="status" className="visually-hidden">
          Loading recently seen patients…
        </p>
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <div key={i} className={styles.skeletonRow}>
            <div className={styles.skeletonText}>
              <Skeleton width="45%" height="22px" />
              <Skeleton width="65%" />
            </div>
            <Skeleton width="84px" height="28px" pill />
          </div>
        ))}
      </div>
    );
  }
  if (data.items.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
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
    <GridList aria-labelledby="recent-title" className={styles.recent} items={data.items}>
      {(patient) => (
        <GridListItem
          id={patient.id}
          href={`/patients/${patient.id}`}
          textValue={listName(patient)}
          className={styles.recentRow}
        >
          <span className={styles.recentText}>
            <span className={styles.recentName}>{listName(patient)}</span>
            <span className={styles.recentMeta}>
              {formatAge(patient.date_of_birth)} · {formatLastVisit(patient.last_visit)}
            </span>
          </span>
          <StatusBadge status={patient.status} />
        </GridListItem>
      )}
    </GridList>
  );
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const now = new Date();
  const { dataUpdatedAt } = useListPatients(countParams(), { query: { select: unwrap } });
  return (
    <>
      <div className={styles.intro}>
        <div className={styles.titleRow}>
          <h1 tabIndex={-1}>{greeting(now)}</h1>
          <OfflineDataBadge updatedAt={dataUpdatedAt} />
        </div>
        <p className={styles.date}>
          <time dateTime={now.toISOString()}>{formatLongDate(now)}</time>
        </p>
      </div>

      <div className={styles.find}>
        <PatientSearchBoundary large />
      </div>

      <section aria-labelledby="counts-title" className={styles.section}>
        <h2 id="counts-title" className={styles.sectionTitle}>
          Patients by status
        </h2>
        <ul className={styles.stats}>
          <StatCard label="Total patients" icon={<Users aria-hidden="true" />} />
          <StatCard label="Active" status="active" icon={<CircleCheck aria-hidden="true" />} />
          <StatCard label="Follow-up" status="follow_up" icon={<Clock aria-hidden="true" />} />
          <StatCard label="Inactive" status="inactive" icon={<CircleMinus aria-hidden="true" />} />
        </ul>
      </section>

      {/* Two columns (3fr / 2fr). The right column is reserved for a status chart, which
          renders nothing in v1, so the card keeps its column width. */}
      <div className={styles.columns}>
        <section aria-labelledby="recent-title" className={styles.card}>
          <div className={styles.cardHead}>
            <h2 id="recent-title" className={styles.sectionTitle}>
              Recently seen
            </h2>
            <Link to="/patients" className={styles.all}>
              All patients
            </Link>
          </div>
          <RecentList />
        </section>
      </div>
    </>
  );
}

import { Link, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { useListPatients } from '../../api/generated/client';
import type { PatientStatus } from '../../api/generated/model';
import { unwrap } from '../../api/unwrap';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { TextField } from '../../components/ui/TextField';
import { formatLastVisit, fullName } from '../../lib/format';
import styles from './DashboardPage.module.css';
import { countParams, recentParams } from './queries';

const greeting = (now: Date) => {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function CountCard({ label, status }: { label: string; status?: PatientStatus }) {
  const { data, isError } = useListPatients(countParams(status), {
    query: { select: unwrap },
  });
  return (
    <div className={styles.card}>
      <dt>{label}</dt>
      <dd>{isError ? 'Unavailable' : (data?.total ?? '…')}</dd>
    </div>
  );
}

function QuickSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = q.trim();
    void navigate({ to: '/patients', search: trimmed ? { q: trimmed } : {} });
  };

  return (
    <search aria-label="Quick patient search">
      <form className={styles.search} onSubmit={submit}>
        <TextField
          label="Search patients"
          description="By name, email or phone"
          value={q}
          onChange={setQ}
          inputMode="search"
        />
        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>
    </search>
  );
}

function RecentlySeen() {
  const { data, isError, isPending, refetch } = useListPatients(recentParams, {
    query: { select: unwrap },
  });

  if (isError) {
    return (
      <ErrorState message="We couldn't load recently seen patients." onRetry={() => refetch()} />
    );
  }
  if (isPending) return <p className={styles.muted}>Loading recently seen patients…</p>;
  if (data.items.length === 0) {
    return (
      <p>
        No patients yet. <Link to="/patients/new">Add the first patient</Link>.
      </p>
    );
  }
  return (
    <ul className={styles.recent}>
      {data.items.map((patient) => (
        <li key={patient.id}>
          <Link to="/patients/$patientId" params={{ patientId: patient.id }}>
            {fullName(patient)}
          </Link>
          <span className={styles.muted}>{formatLastVisit(patient.last_visit)}</span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const now = new Date();
  return (
    <>
      <h1 tabIndex={-1}>Dashboard</h1>
      <p>
        {greeting(now)}. Today is {now.toLocaleDateString(undefined, { dateStyle: 'full' })}.
      </p>

      <section aria-labelledby="counts-title">
        <h2 id="counts-title" className="visually-hidden">
          Patient counts
        </h2>
        <dl className={styles.cards}>
          <CountCard label="Total patients" />
          <CountCard label="Active" status="active" />
          <CountCard label="Follow-up" status="follow_up" />
          <CountCard label="Inactive" status="inactive" />
        </dl>
      </section>

      <QuickSearch />

      <section aria-labelledby="recent-title">
        <h2 id="recent-title">Recently seen</h2>
        <RecentlySeen />
      </section>
    </>
  );
}

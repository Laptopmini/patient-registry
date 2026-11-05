import { useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Archive, Pencil, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { useGetPatient, useListNotes } from '../../../api/generated/client';
import type { PatientOut } from '../../../api/generated/model';
import { removePatient } from '../../../api/invalidate';
import { unwrap } from '../../../api/unwrap';
import { AllergyStrip } from '../../../components/ui/AllergyStrip';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { Button, buttonClass } from '../../../components/ui/Button';
import { CountPill } from '../../../components/ui/CountPill';
import { LinkTabs } from '../../../components/ui/LinkTabs';
import { OfflineDataBadge } from '../../../components/ui/OfflineDataBadge';
import { OfflineGate, useOffline } from '../../../components/ui/OfflineGate';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { bloodTypeLabel, formatAge, formatDate, fullName } from '../../../lib/format';
import { useLayout } from '../../../lib/layout';
import { usePageTitle } from '../../../lib/usePageTitle';
import { ArchiveDialog } from '../ArchiveDialog';
import { useArchivePatient } from '../useArchivePatient';
import styles from './Detail.module.css';
import { Snapshot } from './Snapshot';

const route = getRouteApi('/patients/$patientId/_detail');

type TabKey = 'profile' | 'notes' | 'summary';

/** The active tab comes from the current route, not from a search param. */
function useActiveTab(): TabKey {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.endsWith('/notes')) return 'notes';
  if (pathname.endsWith('/summary')) return 'summary';
  return 'profile';
}

const ALLERGY_STRIP_ID = 'allergy-strip';

/** True once the element has scrolled up behind the sticky header. */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') {
      setPast(false);
      return;
    }
    // The header is 64px tall; the block counts as gone once it has slid under it.
    const observer = new IntersectionObserver(
      ([entry]) =>
        setPast(Boolean(entry && !entry.isIntersecting && entry.boundingClientRect.top < 0)),
      { rootMargin: '-64px 0px 0px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return past;
}

function PatientHeader({
  patient,
  headerRef,
  onArchive,
  updatedAt,
}: {
  updatedAt: number;
  patient: PatientOut;
  headerRef: React.Ref<HTMLElement>;
  onArchive: () => void;
}) {
  const offline = useOffline();
  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.identity}>
        <div className={styles.nameRow}>
          <h1 tabIndex={-1} className={styles.title}>
            {fullName(patient)}
          </h1>
          <StatusBadge status={patient.status} />
          <OfflineDataBadge updatedAt={updatedAt} />
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>Age</dt>
            <dd>{formatAge(patient.date_of_birth)}</dd>
          </div>
          <div>
            <dt>Born</dt>
            <dd>{formatDate(patient.date_of_birth)}</dd>
          </div>
          <div>
            <dt>Blood type</dt>
            <dd>{bloodTypeLabel(patient.blood_type)}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.actions}>
        <Link
          to="/patients/$patientId/edit"
          params={{ patientId: patient.id }}
          className={buttonClass()}
        >
          <Pencil />
          Edit
        </Link>
        <OfflineGate>
          <Button variant="danger" isDisabled={offline} onPress={onArchive}>
            <Archive />
            Archive patient
          </Button>
        </OfflineGate>
      </div>
    </header>
  );
}

/** Compact only: once the header block scrolls away, the name and an allergy chip stay pinned. */
function PinnedBar({ patient }: { patient: PatientOut }) {
  const count = patient.allergies.length;
  return (
    <div className={styles.pinAnchor}>
      <div className={styles.pinned}>
        <span className={styles.pinnedName}>{fullName(patient)}</span>
        {count > 0 && (
          <AriaButton
            className={styles.pinnedChip}
            aria-label={`${count} ${count === 1 ? 'allergy' : 'allergies'}, show the allergy list`}
            onPress={() =>
              document
                .getElementById(ALLERGY_STRIP_ID)
                ?.scrollIntoView({ behavior: 'auto', block: 'center' })
            }
          >
            <TriangleAlert />
            {count} {count === 1 ? 'allergy' : 'allergies'}
          </AriaButton>
        )}
      </div>
    </div>
  );
}

function NotesTabLabel({ patientId }: { patientId: string }) {
  const { data: count } = useListNotes(patientId, {
    query: { select: (response) => unwrap(response).items.length },
  });
  return (
    <>
      Notes
      {count !== undefined && (
        <CountPill count={count} label={`${count} ${count === 1 ? 'note' : 'notes'}`} />
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className={styles.skeletons}>
      <p role="status" className="visually-hidden">
        Loading patient…
      </p>
      <Skeleton width="40%" height="34px" />
      <Skeleton width="55%" />
      <Skeleton height="60px" />
      <Skeleton height="48px" />
    </div>
  );
}

/** Shared layout: breadcrumb, header, allergy strip, tabs (router links) and the active child route. */
export function PatientDetailLayout() {
  const { patientId } = route.useParams();
  const tab = useActiveTab();
  const layout = useLayout();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: patient,
    dataUpdatedAt,
    error,
  } = useGetPatient(patientId, { query: { select: unwrap } });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pinned = useScrolledPast(headerRef, layout === 'compact');
  usePageTitle(patient ? fullName(patient) : undefined);

  const archive = useArchivePatient({
    onArchived: async (id) => {
      await navigate({ to: '/patients' });
      // Only after leaving the page, so nothing refetches the now-missing patient.
      removePatient(queryClient, id);
    },
  });

  // The route loader normally has this cached. If it's missing, let the error component handle it.
  if (!patient) {
    if (error) throw error;
    return <DetailSkeleton />;
  }

  const outlet =
    layout === 'wide' && tab !== 'profile' ? (
      <div className={styles.withSnapshot}>
        <div>
          <Outlet />
        </div>
        <Snapshot patient={patient} />
      </div>
    ) : (
      <Outlet />
    );

  return (
    <>
      {layout === 'compact' && pinned && <PinnedBar patient={patient} />}
      <Breadcrumbs
        items={[{ label: 'Patients', href: '/patients' }, { label: fullName(patient) }]}
      />
      <PatientHeader
        patient={patient}
        headerRef={headerRef}
        updatedAt={dataUpdatedAt}
        onArchive={() => setArchiveOpen(true)}
      />
      <AllergyStrip id={ALLERGY_STRIP_ID} allergies={patient.allergies.map((a) => a.name)} />
      <LinkTabs
        label="Patient sections"
        selectedKey={tab}
        tabs={[
          { id: 'profile', label: 'Profile', href: `/patients/${patient.id}` },
          {
            id: 'notes',
            label: <NotesTabLabel patientId={patient.id} />,
            href: `/patients/${patient.id}/notes`,
          },
          { id: 'summary', label: 'Summary', href: `/patients/${patient.id}/summary` },
        ]}
      >
        {outlet}
      </LinkTabs>
      <ArchiveDialog
        name={fullName(patient)}
        isOpen={archiveOpen}
        onOpenChange={setArchiveOpen}
        isPending={archive.isPending}
        onConfirm={() => archive.mutate({ id: patient.id, version: patient.version })}
      />
    </>
  );
}

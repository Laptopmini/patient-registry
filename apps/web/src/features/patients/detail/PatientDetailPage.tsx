import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getRouteApi, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { deletePatient, useGetPatient } from '../../../api/generated/client';
import type { PatientOut } from '../../../api/generated/model';
import { isApiError } from '../../../api/http';
import { ifMatch, invalidatePatientLists, removePatient } from '../../../api/invalidate';
import { unwrap } from '../../../api/unwrap';
import { Button, buttonClass } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { bloodTypeLabel, formatAge, formatDate, fullName } from '../../../lib/format';
import { showToast } from '../../../lib/toast';
import styles from './Detail.module.css';

function AllergyStrip({ patient }: { patient: PatientOut }) {
  const names = patient.allergies.map((a) => a.name);
  return (
    <section
      aria-label="Allergies"
      className={`${styles.allergies} ${names.length === 0 ? styles.allergiesNone : ''}`}
    >
      <span aria-hidden="true">{names.length ? '⚠' : '✓'}</span>
      <p className={styles.allergyText}>
        {names.length ? `Allergies: ${names.join(', ')}` : 'No known allergies'}
      </p>
    </section>
  );
}

function useArchive(patient: PatientOut) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => deletePatient(patient.id, { headers: ifMatch(patient.version) }),
    onSuccess: async () => {
      void invalidatePatientLists(queryClient);
      showToast('Patient archived');
      await navigate({ to: '/patients' });
      // Only after leaving the page, so nothing refetches the now-missing patient.
      removePatient(queryClient, patient.id);
    },
    onError: (error) => {
      showToast(
        isApiError(error) && error.status === 412
          ? 'This patient was changed by someone else. Reload and try again.'
          : "The patient couldn't be archived. Try again.",
        'error',
      );
    },
  });
}

const route = getRouteApi('/patients/$patientId/_detail');

type TabKey = 'profile' | 'notes' | 'summary';

/** The active tab comes from the current route, not from a search param. */
function useActiveTab(): TabKey {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.endsWith('/notes')) return 'notes';
  if (pathname.endsWith('/summary')) return 'summary';
  return 'profile';
}

/** Shared layout: header, allergy strip, tabs (router links) and the active child route. */
export function PatientDetailLayout() {
  const { patientId } = route.useParams();
  const tab = useActiveTab();
  const { data: patient, error } = useGetPatient(patientId, { query: { select: unwrap } });
  const [archiveOpen, setArchiveOpen] = useState(false);

  // The route loader normally has this cached. If it's missing, let the error component handle it.
  if (!patient) {
    if (error) throw error;
    return <div aria-busy="true" className={styles.skeletonPage} />;
  }

  return (
    <>
      <PatientHeader patient={patient} onArchive={() => setArchiveOpen(true)} />
      <Tabs selectedKey={tab}>
        <TabList aria-label="Patient sections" className={styles.tabList}>
          <Tab id="profile" href={`/patients/${patient.id}`} className={styles.tab}>
            Profile
          </Tab>
          <Tab id="notes" href={`/patients/${patient.id}/notes`} className={styles.tab}>
            Notes
          </Tab>
          <Tab id="summary" href={`/patients/${patient.id}/summary`} className={styles.tab}>
            Summary
          </Tab>
        </TabList>
        <TabPanel id={tab} className={styles.panel}>
          <Outlet />
        </TabPanel>
      </Tabs>
      <ArchiveDialog patient={patient} isOpen={archiveOpen} onOpenChange={setArchiveOpen} />
    </>
  );
}

function PatientHeader({ patient, onArchive }: { patient: PatientOut; onArchive: () => void }) {
  return (
    <header className={styles.header}>
      <h1 tabIndex={-1} className={styles.title}>
        {fullName(patient)}
      </h1>
      <p className={styles.meta}>
        <span>
          {formatAge(patient.date_of_birth)} (born {formatDate(patient.date_of_birth)})
        </span>
        <StatusBadge status={patient.status} />
        <span>Blood type: {bloodTypeLabel(patient.blood_type)}</span>
      </p>
      <AllergyStrip patient={patient} />
      <div className={styles.actions}>
        <Link
          to="/patients/$patientId/edit"
          params={{ patientId: patient.id }}
          className={buttonClass('primary')}
        >
          Edit
        </Link>
        <Button variant="danger" onPress={onArchive}>
          Archive patient
        </Button>
      </div>
    </header>
  );
}

function ArchiveDialog({
  patient,
  isOpen,
  onOpenChange,
}: {
  patient: PatientOut;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const archive = useArchive(patient);
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Archive this patient?"
      confirmLabel="Archive patient"
      destructive
      isPending={archive.isPending}
      onConfirm={() => archive.mutate()}
    >
      <p>
        {fullName(patient)} will disappear from the registry. Their record is kept, but it can't be
        restored from here.
      </p>
    </ConfirmDialog>
  );
}

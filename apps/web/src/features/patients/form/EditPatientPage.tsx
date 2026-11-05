import { getRouteApi } from '@tanstack/react-router';
import { useGetPatient } from '../../../api/generated/client';
import { unwrap } from '../../../api/unwrap';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { Skeleton } from '../../../components/ui/Skeleton';
import { fullName } from '../../../lib/format';
import { usePageTitle } from '../../../lib/usePageTitle';
import { PatientForm } from './PatientForm';
import styles from './PatientForm.module.css';

const route = getRouteApi('/patients/$patientId/edit');

/** Matches the form's final layout so nothing jumps when the record arrives. */
function EditSkeleton() {
  return (
    <div aria-busy="true" className={styles.form}>
      <p role="status" className="visually-hidden">
        Loading patient…
      </p>
      <Skeleton width="60%" height="20px" />
      {[0, 1].map((group) => (
        <div key={group} className={styles.skeletonGroup}>
          <Skeleton width="30%" height="26px" />
          <div className={styles.skeletonRow}>
            <Skeleton height="44px" />
            <Skeleton height="44px" />
          </div>
          <div className={styles.skeletonRow}>
            <Skeleton height="44px" />
            <Skeleton height="44px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditPatientPage() {
  const { patientId } = route.useParams();
  const { data: patient, error } = useGetPatient(patientId, { query: { select: unwrap } });
  usePageTitle(patient ? `Edit ${fullName(patient)}` : 'Edit patient');

  if (!patient && error) throw error;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Patients', href: '/patients' },
          { label: patient ? fullName(patient) : 'Patient', href: `/patients/${patientId}` },
          { label: 'Edit' },
        ]}
      />
      <h1 tabIndex={-1}>{patient ? `Edit ${fullName(patient)}` : 'Edit patient'}</h1>
      {patient ? (
        // Keyed by id so the form never carries values from another patient.
        <PatientForm key={patient.id} patient={patient} />
      ) : (
        <EditSkeleton />
      )}
    </>
  );
}

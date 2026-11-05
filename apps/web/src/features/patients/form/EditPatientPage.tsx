import { getRouteApi } from '@tanstack/react-router';
import { useGetPatient } from '../../../api/generated/client';
import { unwrap } from '../../../api/unwrap';
import { fullName } from '../../../lib/format';
import { usePageTitle } from '../../../lib/usePageTitle';
import { PatientForm } from './PatientForm';

const route = getRouteApi('/patients/$patientId/edit');

export function EditPatientPage() {
  const { patientId } = route.useParams();
  const { data: patient, error } = useGetPatient(patientId, { query: { select: unwrap } });
  usePageTitle(patient ? `Edit ${fullName(patient)}` : undefined);

  if (!patient) {
    if (error) throw error;
    return <div aria-busy="true" />;
  }

  return (
    <>
      <h1 tabIndex={-1}>Edit {fullName(patient)}</h1>
      {/* Keyed by id so the form never carries values from another patient. */}
      <PatientForm key={patient.id} patient={patient} />
    </>
  );
}

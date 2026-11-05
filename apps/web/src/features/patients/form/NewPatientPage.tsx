import { usePageTitle } from '../../../lib/usePageTitle';
import { PatientForm } from './PatientForm';

export function NewPatientPage() {
  usePageTitle('New patient');
  return (
    <>
      <h1 tabIndex={-1}>New patient</h1>
      <PatientForm />
    </>
  );
}

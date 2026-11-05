import { createFileRoute } from '@tanstack/react-router';
import { RouteError } from '../../../../components/shell/RouteError';
import { ensurePatient } from '../../../../features/patients/detail/ensurePatient';
import { PatientDetailLayout } from '../../../../features/patients/detail/PatientDetailPage';

export const Route = createFileRoute('/patients/$patientId/_detail')({
  loader: ({ context, params }) => ensurePatient(context.queryClient, params.patientId),
  component: PatientDetailLayout,
  errorComponent: RouteError,
});

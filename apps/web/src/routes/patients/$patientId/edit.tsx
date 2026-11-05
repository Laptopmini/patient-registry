import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../../../components/shell/RouteError';
import { ensurePatient } from '../../../features/patients/detail/ensurePatient';
import { EditPatientPage } from '../../../features/patients/form/EditPatientPage';

export const Route = createFileRoute('/patients/$patientId/edit')({
  validateSearch: z.object({}),
  loader: ({ context, params }) => ensurePatient(context.queryClient, params.patientId),
  component: EditPatientPage,
  errorComponent: RouteError,
});

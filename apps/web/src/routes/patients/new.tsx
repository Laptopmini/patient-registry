import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../../components/shell/RouteError';
import { NewPatientPage } from '../../features/patients/form/NewPatientPage';

export const Route = createFileRoute('/patients/new')({
  validateSearch: z.object({}),
  component: NewPatientPage,
  errorComponent: RouteError,
});

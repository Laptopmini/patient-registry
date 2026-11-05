import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../../../../components/shell/RouteError';
import { ProfileRoute } from '../../../../features/patients/detail/ProfileRoute';

export const Route = createFileRoute('/patients/$patientId/_detail/')({
  validateSearch: z.object({}),
  component: ProfileRoute,
  errorComponent: RouteError,
});

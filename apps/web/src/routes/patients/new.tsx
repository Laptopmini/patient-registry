import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../../components/shell/RouteError';
import { PatientWizard } from '../../features/patients/form/PatientWizard';

export const Route = createFileRoute('/patients/new')({
  // `?step=` is 1 to 4; anything else falls back to the first step.
  validateSearch: z.object({
    step: z.number().int().min(1).max(4).default(1).catch(1),
  }),
  component: PatientWizard,
  errorComponent: RouteError,
});

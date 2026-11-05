import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../../../../components/shell/RouteError';
import { SummaryTab } from '../../../../features/patients/detail/SummaryTab';

function SummaryRoute() {
  const { patientId } = Route.useParams();
  return <SummaryTab patientId={patientId} />;
}

export const Route = createFileRoute('/patients/$patientId/_detail/summary')({
  validateSearch: z.object({}),
  component: SummaryRoute,
  errorComponent: RouteError,
});

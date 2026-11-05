import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../../../../components/shell/RouteError';
import { NotesTab } from '../../../../features/notes/NotesTab';

function NotesRoute() {
  const { patientId } = Route.useParams();
  return <NotesTab patientId={patientId} />;
}

export const Route = createFileRoute('/patients/$patientId/_detail/notes')({
  validateSearch: z.object({}),
  component: NotesRoute,
  errorComponent: RouteError,
});

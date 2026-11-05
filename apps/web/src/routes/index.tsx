import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { RouteError } from '../components/shell/RouteError';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { prefetchDashboard } from '../features/dashboard/queries';

export const Route = createFileRoute('/')({
  validateSearch: z.object({}),
  loader: ({ context }) => {
    prefetchDashboard(context.queryClient);
  },
  component: DashboardPage,
  errorComponent: RouteError,
});

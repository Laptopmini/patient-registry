import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext } from '@tanstack/react-router';
import { NotFoundPage } from '../components/shell/NotFoundPage';
import { RouteError } from '../components/shell/RouteError';
import { Shell } from '../components/shell/Shell';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Shell,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteError,
});

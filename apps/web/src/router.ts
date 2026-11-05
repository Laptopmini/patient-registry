import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { NotFoundPage } from './components/shell/NotFoundPage';
import { RouteError } from './components/shell/RouteError';
import { withDevRoutes } from './devRoutes';
import { routeTree } from './routeTree.gen';

export function createAppRouter(options: { queryClient: QueryClient; history?: RouterHistory }) {
  return createRouter({
    // The component gallery exists in development only (see devRoutes.ts).
    routeTree: import.meta.env.DEV ? withDevRoutes(routeTree) : routeTree,
    context: { queryClient: options.queryClient },
    ...(options.history ? { history: options.history } : {}),
    defaultPreload: 'intent',
    // Query's own staleTime decides freshness; the router should not add a second cache.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFoundPage,
    scrollRestoration: true,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}

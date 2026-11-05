import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { NotFoundPage } from './components/shell/NotFoundPage';
import { RouteError } from './components/shell/RouteError';
import { withDevRoutes } from './devRoutes';
import { prefersReducedMotion } from './lib/viewTransition';
import { routeTree } from './routeTree.gen';

/** Moving between a patient's tabs is a tab change (its own fade), not a page change. */
const patientBase = (pathname: string) => pathname.match(/^\/patients\/[^/]+/)?.[0];

const routeTransition = {
  types: ({
    fromLocation,
    toLocation,
  }: {
    fromLocation?: { pathname: string } | undefined;
    toLocation: { pathname: string };
  }) => {
    // Checked on every navigation, so a change of the OS setting applies at once.
    if (prefersReducedMotion()) return false;
    const from = fromLocation ? patientBase(fromLocation.pathname) : undefined;
    if (from && from === patientBase(toLocation.pathname)) return false;
    return ['route'];
  },
};

export function createAppRouter(options: { queryClient: QueryClient; history?: RouterHistory }) {
  return createRouter({
    // The component gallery exists in development only (see devRoutes.ts).
    routeTree: import.meta.env.DEV ? withDevRoutes(routeTree) : routeTree,
    context: { queryClient: options.queryClient },
    ...(options.history ? { history: options.history } : {}),
    // Route changes cross-fade the page (motion.md #1). Never under reduced motion.
    defaultViewTransition: prefersReducedMotion() ? false : routeTransition,
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

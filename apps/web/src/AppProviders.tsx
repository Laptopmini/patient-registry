import { OpenFeatureProvider } from '@openfeature/react-sdk';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { AppRouter } from './router';

interface AppProvidersProps {
  queryClient: QueryClient;
  router: AppRouter;
}

/** Everything the app needs above the router: feature flags and server state. */
export function AppProviders({ queryClient, router }: AppProvidersProps) {
  return (
    <OpenFeatureProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </OpenFeatureProvider>
  );
}

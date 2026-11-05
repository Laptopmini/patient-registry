import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { AppRouter } from './router';

interface AppProvidersProps {
  queryClient: QueryClient;
  router: AppRouter;
}

/**
 * Everything the app needs above the router: server state. Feature flags are registered
 * after first paint (`lib/flags`); the React SDK's provider is optional (its hooks use the
 * global client), so it isn't in the first-paint bundle until a screen needs a flag.
 */
export function AppProviders({ queryClient, router }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

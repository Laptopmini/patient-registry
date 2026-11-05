import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './http';

const MAX_RETRIES = 2;

/** Never retry 4xx responses; retry network and 5xx failures up to twice. */
export const shouldRetry = (failureCount: number, error: unknown) => {
  if (isApiError(error) && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
};

export const createQueryClient = (overrides?: { retry?: false }) =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: overrides?.retry ?? shouldRetry },
      // Failures should surface right away, with a retry option, not pause silently offline.
      mutations: { networkMode: 'always' },
    },
  });

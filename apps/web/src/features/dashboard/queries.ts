import type { QueryClient } from '@tanstack/react-query';
import { getListPatientsQueryOptions } from '../../api/generated/client';
import type { ListPatientsParams, PatientStatus } from '../../api/generated/model';

/** Count cards read `total` from `limit=1` list queries. */
export const countParams = (status?: PatientStatus): ListPatientsParams => ({
  ...(status ? { status } : {}),
  limit: 1,
});

export const recentParams: ListPatientsParams = { sort: '-last_visit', limit: 5 };

export function prefetchDashboard(queryClient: QueryClient) {
  const all: ListPatientsParams[] = [
    countParams(),
    countParams('active'),
    countParams('follow_up'),
    countParams('inactive'),
    recentParams,
  ];
  for (const params of all) {
    queryClient.ensureQueryData(getListPatientsQueryOptions(params)).catch(() => undefined);
  }
}

import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { getListPatientsQueryOptions } from '../../api/generated/client';
import { RouteError } from '../../components/shell/RouteError';
import {
  DEFAULT_SORT,
  listSearchSchema,
  toListParams,
} from '../../features/patients/list/listSearch';
import { PatientListPage } from '../../features/patients/list/PatientListPage';

export const Route = createFileRoute('/patients/')({
  validateSearch: listSearchSchema,
  search: { middlewares: [stripSearchParams({ sort: DEFAULT_SORT, page: 1 })] },
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ context, deps }) => {
    // Warm the cache without blocking: awaiting here would delay URL updates while typing.
    context.queryClient
      .ensureQueryData(getListPatientsQueryOptions(toListParams(deps.search)))
      .catch(() => undefined);
  },
  component: PatientListPage,
  errorComponent: RouteError,
});

import { z } from 'zod';
import { type ListPatientsParams, PatientStatus, SortField } from '../../../api/generated/model';

export const PAGE_SIZE = 20;
export const DEFAULT_SORT = SortField.last_name;

/** URL state of the patient list. Invalid values fall back to the defaults. */
export const listSearchSchema = z.object({
  // TanStack parses `?q=123` as a number, so coerce back to text.
  q: z.coerce.string().trim().max(100).optional().catch(undefined),
  status: z.enum(PatientStatus).optional().catch(undefined),
  sort: z.enum(SortField).default(DEFAULT_SORT).catch(DEFAULT_SORT),
  page: z.number().int().min(1).default(1).catch(1),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

/** Translates URL state into the API's query parameters. */
export function toListParams(search: ListSearch): ListPatientsParams {
  return {
    ...(search.q ? { q: search.q } : {}),
    ...(search.status ? { status: search.status } : {}),
    sort: search.sort,
    limit: PAGE_SIZE,
    offset: (search.page - 1) * PAGE_SIZE,
  };
}

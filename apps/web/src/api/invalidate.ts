import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** Generated query keys start with the URL path, for example `/patients/<id>/notes`. */
const path = (key: QueryKey) => (typeof key[0] === 'string' ? key[0] : '');

/** Refetch every cached patient list (the list page and the dashboard cards). */
export const invalidatePatientLists = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ predicate: (q) => path(q.queryKey) === '/patients' });

/** Refetch a patient's detail, notes and summary. */
export const invalidatePatient = (queryClient: QueryClient, patientId: string) =>
  queryClient.invalidateQueries({
    predicate: (q) => {
      const p = path(q.queryKey);
      return p === `/patients/${patientId}` || p.startsWith(`/patients/${patientId}/`);
    },
  });

/** Drop everything cached for a patient (after archiving, so nothing refetches a 404). */
export const removePatient = (queryClient: QueryClient, patientId: string) =>
  queryClient.removeQueries({
    predicate: (q) => {
      const p = path(q.queryKey);
      return p === `/patients/${patientId}` || p.startsWith(`/patients/${patientId}/`);
    },
  });

/** The If-Match value for a patient version. */
export const ifMatch = (version: number) => ({ 'If-Match': `"${version}"` });

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePatient, getPatient } from '../../api/generated/client';
import { isApiError } from '../../api/http';
import { ifMatch, invalidatePatientLists } from '../../api/invalidate';
import { unwrap } from '../../api/unwrap';
import { showToast } from '../../lib/toast';

interface ArchiveOptions {
  /** Runs after a successful archive, once the lists have been refreshed. */
  onArchived?: (patientId: string) => void | Promise<void>;
}

/**
 * Archives a patient by id. The version needed for `If-Match` is read just before the
 * delete when the caller only has a list row, so the request is always conditional.
 */
export function useArchivePatient({ onArchived }: ArchiveOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, version }: { id: string; version?: number }) => {
      const current = version ?? unwrap(await getPatient(id)).version;
      await deletePatient(id, { headers: ifMatch(current) });
    },
    onSuccess: async (_data, { id }) => {
      void invalidatePatientLists(queryClient);
      showToast('Patient archived');
      await onArchived?.(id);
    },
    onError: (error) => {
      showToast(
        isApiError(error) && error.status === 412
          ? 'This patient was changed by someone else. Reload and try again.'
          : "The patient couldn't be archived. Try again.",
        'error',
      );
    },
  });
}

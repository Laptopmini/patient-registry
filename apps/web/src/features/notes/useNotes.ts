import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createNote,
  deleteNote,
  getGetPatientQueryKey,
  getGetPatientSummaryQueryKey,
  getListNotesQueryKey,
  type listNotesResponse,
} from '../../api/generated/client';
import type { NoteIn, NoteOut } from '../../api/generated/model';
import { invalidatePatientLists } from '../../api/invalidate';

export const OPTIMISTIC_PREFIX = 'optimistic-';
export const isOptimistic = (note: NoteOut) => note.id.startsWith(OPTIMISTIC_PREFIX);

type NotesCache = listNotesResponse | undefined;

/** Applies `change` to the cached notes (if any) and returns what was there before. */
function patchCache(
  queryClient: ReturnType<typeof useQueryClient>,
  patientId: string,
  change: (items: NoteOut[]) => NoteOut[],
) {
  const key = getListNotesQueryKey(patientId);
  const previous = queryClient.getQueryData<NotesCache>(key);
  queryClient.setQueryData<NotesCache>(key, (old) =>
    old && old.status === 200 ? { ...old, data: { items: change(old.data.items) } } : old,
  );
  return previous;
}

function useRefreshAfterNoteChange(patientId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(patientId) });
    // The summary, the patient's last visit and the lists all derive from notes.
    void queryClient.invalidateQueries({ queryKey: getGetPatientSummaryQueryKey(patientId) });
    void queryClient.invalidateQueries({ queryKey: getGetPatientQueryKey(patientId) });
    void invalidatePatientLists(queryClient);
  };
}

/** Adds a note optimistically; rolls back when the request fails. */
export function useAddNote(patientId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterNoteChange(patientId);

  return useMutation({
    mutationFn: (input: NoteIn) => createNote(patientId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: getListNotesQueryKey(patientId) });
      const optimistic: NoteOut = {
        id: `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`,
        patient_id: patientId,
        recorded_at: input.recorded_at,
        body: input.body,
        created_at: new Date().toISOString(),
      };
      const previous = patchCache(queryClient, patientId, (items) => [optimistic, ...items]);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getListNotesQueryKey(patientId), context.previous);
      }
    },
    onSettled: refresh,
  });
}

/** Deletes a note optimistically; rolls back when the request fails. */
export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterNoteChange(patientId);

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(patientId, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: getListNotesQueryKey(patientId) });
      const previous = patchCache(queryClient, patientId, (items) =>
        items.filter((note) => note.id !== noteId),
      );
      return { previous };
    },
    onError: (_error, _noteId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getListNotesQueryKey(patientId), context.previous);
      }
    },
    onSettled: refresh,
  });
}

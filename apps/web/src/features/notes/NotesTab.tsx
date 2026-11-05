import { useRef, useState } from 'react';
import { useListNotes } from '../../api/generated/client';
import type { NoteOut } from '../../api/generated/model';
import { unwrap } from '../../api/unwrap';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorState } from '../../components/ui/ErrorState';
import { differsByMoreThanAMinute, formatDateTime, formatRelative } from '../../lib/format';
import { showToast } from '../../lib/toast';
import { NoteForm } from './NoteForm';
import styles from './Notes.module.css';
import { isOptimistic, useDeleteNote } from './useNotes';

const TRUNCATE_AT = 400;

function NoteBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = body.length > TRUNCATE_AT;
  return (
    <>
      <p className={`${styles.body} ${long && !expanded ? styles.clamped : ''}`}>{body}</p>
      {long && (
        <Button variant="quiet" aria-expanded={expanded} onPress={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </>
  );
}

function NoteItem({ note, onDelete }: { note: NoteOut; onDelete: (note: NoteOut) => void }) {
  const pending = isOptimistic(note);
  return (
    <li className={`${styles.note} ${pending ? styles.pending : ''}`}>
      <div className={styles.noteHeader}>
        <time className={styles.recordedAt} dateTime={note.recorded_at}>
          {formatDateTime(note.recorded_at)}
        </time>
        <span className={styles.added}>
          {pending
            ? 'Saving…'
            : differsByMoreThanAMinute(note.recorded_at, note.created_at)
              ? `added ${formatRelative(note.created_at)}`
              : ''}
        </span>
      </div>
      <NoteBody body={note.body} />
      {!pending && (
        <div className={styles.noteActions}>
          <Button
            variant="quiet"
            aria-label={`Delete note from ${formatDateTime(note.recorded_at)}`}
            onPress={() => onDelete(note)}
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}

export function NotesTab({ patientId }: { patientId: string }) {
  const { data, isPending, isError, refetch } = useListNotes(patientId, {
    query: { select: unwrap },
  });
  const deleteNote = useDeleteNote(patientId);
  const [toDelete, setToDelete] = useState<NoteOut | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const notes = data
    ? [...data.items].sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at))
    : [];

  const confirmDelete = () => {
    if (!toDelete) return;
    const note = toDelete;
    setToDelete(null);
    deleteNote.mutate(note.id, {
      onSuccess: () => showToast('Note deleted'),
      onError: () => showToast("The note couldn't be deleted. It has been restored.", 'error'),
      onSettled: () => headingRef.current?.focus(),
    });
  };

  return (
    <div>
      <NoteForm patientId={patientId} />

      <h2 ref={headingRef} tabIndex={-1}>
        Notes
      </h2>
      {isError && (
        <ErrorState message="We couldn't load the notes." onRetry={() => void refetch()} />
      )}
      {isPending && !isError && (
        <div className={styles.skeleton} aria-busy="true" role="status">
          <span className="visually-hidden">Loading notes…</span>
        </div>
      )}
      {data &&
        (notes.length === 0 ? (
          <p className={styles.empty}>No notes yet. Add the first note above.</p>
        ) : (
          <ul className={styles.list}>
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} onDelete={setToDelete} />
            ))}
          </ul>
        ))}

      <ConfirmDialog
        isOpen={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Delete this note?"
        confirmLabel="Delete note"
        destructive
        onConfirm={confirmDelete}
      >
        <p>This can't be undone.</p>
      </ConfirmDialog>
    </div>
  );
}

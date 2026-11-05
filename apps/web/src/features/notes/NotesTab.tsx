import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useListNotes } from '../../api/generated/client';
import type { NoteOut } from '../../api/generated/model';
import { unwrap } from '../../api/unwrap';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import dialogStyles from '../../components/ui/ConfirmDialog.module.css';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDateTime, formatRelative, onDifferentDays } from '../../lib/format';
import { showToast } from '../../lib/toast';
import { NoteForm } from './NoteForm';
import styles from './Notes.module.css';
import { isOptimistic, useDeleteNote } from './useNotes';

/** About six lines of note text; longer bodies are clamped with "Show more". */
const CLAMP_AT = 360;
const QUOTE_LENGTH = 140;

function NoteBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const long = body.length > CLAMP_AT;
  return (
    <>
      <p id={id} className={`${styles.body} ${long && !expanded ? styles.clamped : ''}`}>
        {body}
      </p>
      {long && (
        <Button
          variant="link"
          aria-expanded={expanded}
          aria-controls={id}
          onPress={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </>
  );
}

function NoteItem({ note, onDelete }: { note: NoteOut; onDelete: (note: NoteOut) => void }) {
  const pending = isOptimistic(note);
  const showAdded = !pending && onDifferentDays(note.recorded_at, note.created_at);
  return (
    <li className={`${styles.note} ${pending ? styles.pending : ''}`}>
      <article>
        <div className={styles.noteHeader}>
          <div className={styles.noteTimes}>
            <time className={styles.recordedAt} dateTime={note.recorded_at}>
              {formatDateTime(note.recorded_at)}
            </time>
            {showAdded && (
              <span className={styles.added} title={formatDateTime(note.created_at)}>
                · added {formatRelative(note.created_at)}
              </span>
            )}
          </div>
          {pending ? (
            <span className={styles.saving}>Saving…</span>
          ) : (
            <Button
              variant="quiet"
              danger
              data-delete-for={note.id}
              aria-label={`Delete note from ${formatDateTime(note.recorded_at)}`}
              onPress={() => onDelete(note)}
            >
              <Trash2 />
            </Button>
          )}
        </div>
        <NoteBody body={note.body} />
      </article>
    </li>
  );
}

/** After a delete: the next note's delete button, or the composer's textarea when none is left. */
function moveFocusAfterDelete(nextId: string | undefined) {
  const next = nextId
    ? document.querySelector<HTMLElement>(`[data-delete-for="${CSS.escape(nextId)}"]`)
    : null;
  (next ?? document.querySelector<HTMLElement>('textarea[name="body"]'))?.focus();
}

function NotesSkeleton() {
  return (
    <div className={styles.skeletons} aria-busy="true">
      <p role="status" className="visually-hidden">
        Loading notes…
      </p>
      {['a', 'b', 'c'].map((key) => (
        <div key={key} className={styles.skeletonNote}>
          <Skeleton width="30%" height="22px" />
          <Skeleton />
          <Skeleton width="75%" />
        </div>
      ))}
    </div>
  );
}

export function NotesTab({ patientId }: { patientId: string }) {
  const { data, isPending, isError, refetch } = useListNotes(patientId, {
    query: { select: unwrap },
  });
  const deleteNote = useDeleteNote(patientId);
  const [toDelete, setToDelete] = useState<NoteOut | null>(null);

  const notes = data
    ? [...data.items].sort((a, b) => Date.parse(b.recorded_at) - Date.parse(a.recorded_at))
    : [];

  const confirmDelete = () => {
    if (!toDelete) return;
    const note = toDelete;
    const index = notes.findIndex((n) => n.id === note.id);
    const neighbour = notes[index + 1] ?? notes[index - 1];
    setToDelete(null);
    deleteNote.mutate(note.id, {
      onSuccess: () => showToast('Note deleted'),
      onError: () => showToast("We couldn't delete the note. Try again.", 'error'),
      onSettled: () => moveFocusAfterDelete(neighbour?.id),
    });
  };

  return (
    <div className={styles.stack}>
      <NoteForm patientId={patientId} />

      <section aria-labelledby="notes-title">
        <div className={styles.listHead}>
          <h2 id="notes-title">Notes</h2>
          {data && notes.length > 0 && (
            <p className={styles.listMeta}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} · newest clinical time first
            </p>
          )}
        </div>
        {isError && (
          <ErrorState message="We couldn't load the notes." onRetry={() => void refetch()} />
        )}
        {isPending && !isError && <NotesSkeleton />}
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
      </section>

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
        {toDelete && (
          <blockquote className={dialogStyles.quote}>
            <span className={styles.quoteTime}>{formatDateTime(toDelete.recorded_at)}</span>
            <br />
            {toDelete.body.length > QUOTE_LENGTH
              ? `${toDelete.body.slice(0, QUOTE_LENGTH)}…`
              : toDelete.body}
          </blockquote>
        )}
      </ConfirmDialog>
    </div>
  );
}

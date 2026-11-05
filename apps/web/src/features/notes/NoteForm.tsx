import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { isNetworkError } from '../../api/http';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { TextField } from '../../components/ui/TextField';
import styles from './Notes.module.css';
import {
  COUNTER_THRESHOLD,
  currentMinuteIso,
  isoFromZoned,
  NOTE_MAX,
  type NoteFormValues,
  noteFormSchema,
  zonedFromIso,
} from './noteFormSchema';
import { useAddNote } from './useNotes';

type NoteFormOutput = z.output<typeof noteFormSchema>;

export function NoteForm({ patientId }: { patientId: string }) {
  const addNote = useAddNote(patientId);
  const [failure, setFailure] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const form = useForm<NoteFormValues, unknown, NoteFormOutput>({
    resolver: zodResolver(noteFormSchema),
    mode: 'onBlur',
    defaultValues: { recorded_at: currentMinuteIso(), body: '' },
  });
  const body = useWatch({ control: form.control, name: 'body' });
  const remaining = NOTE_MAX - body.length;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await addNote.mutateAsync(values);
    } catch (error) {
      // Keep the text so nothing is lost; the user can retry.
      setFailure(
        isNetworkError(error)
          ? "Couldn't reach the server. Your note is kept."
          : "We couldn't save the note. Your text is kept.",
      );
      return;
    }
    form.reset({ recorded_at: currentMinuteIso(), body: '' });
    bodyRef.current?.focus();
  });

  return (
    <form className={styles.form} onSubmit={submit} aria-label="Add a note" noValidate>
      <Controller
        control={form.control}
        name="recorded_at"
        render={({ field, fieldState }) => (
          <DatePickerField
            label="Date and time of encounter"
            granularity="minute"
            value={field.value ? zonedFromIso(field.value) : null}
            onChange={(value) => field.onChange(value ? isoFromZoned(value) : '')}
            onBlur={field.onBlur}
            name={field.name}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={form.control}
        name="body"
        render={({ field, fieldState }) => (
          <TextField
            label="Note"
            multiline
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={(element) => {
              field.ref(element);
              bodyRef.current = element;
            }}
            error={fieldState.error?.message}
            footer={
              remaining <= COUNTER_THRESHOLD
                ? `${remaining.toLocaleString()} characters remaining`
                : undefined
            }
          />
        )}
      />
      {failure && (
        <Banner
          tone="error"
          role="alert"
          action={
            <Button variant="primary" onPress={() => void submit()}>
              Retry
            </Button>
          }
        >
          {failure}
        </Banner>
      )}
      <div className={styles.formActions}>
        <Button type="submit" variant="primary" isDisabled={addNote.isPending}>
          {addNote.isPending ? 'Adding…' : 'Add note'}
        </Button>
      </div>
    </form>
  );
}

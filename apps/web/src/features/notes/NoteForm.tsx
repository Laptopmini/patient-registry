import { zodResolver } from '@hookform/resolvers/zod';
import {
  getLocalTimeZone,
  toCalendarDate,
  toCalendarDateTime,
  toTime,
  toZoned,
} from '@internationalized/date';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { InlineError } from '../../components/ui/FieldMessage';
import { TextField } from '../../components/ui/TextField';
import { TimeFieldInput } from '../../components/ui/TimeFieldInput';
import styles from './Notes.module.css';
import {
  currentMinuteIso,
  isoFromZoned,
  NOTE_MAX,
  type NoteFormValues,
  noteFormSchema,
  zonedFromIso,
} from './noteFormSchema';
import { useAddNote } from './useNotes';

type NoteFormOutput = z.output<typeof noteFormSchema>;

/** The counter stays hidden until 4,500 characters, then turns red from 4,900. */
const COUNTER_SHOWS_AT = 4500;
const COUNTER_WARNS_AT = 4900;

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

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    // The note is already in the list (optimistic), so the form clears and keeps focus now.
    const sent = values;
    form.reset({ recorded_at: currentMinuteIso(), body: '' });
    bodyRef.current?.focus();
    try {
      await addNote.mutateAsync(sent);
    } catch {
      // Put the text back so nothing is lost; the user can retry.
      form.reset(sent);
      setFailure("We couldn't save this note.");
    }
  });

  return (
    <form className={styles.composer} onSubmit={submit} aria-labelledby="composer-title" noValidate>
      <h2 id="composer-title">Add a note</h2>
      <Controller
        control={form.control}
        name="recorded_at"
        render={({ field, fieldState }) => {
          const zoned = field.value ? zonedFromIso(field.value) : null;
          const timeZone = getLocalTimeZone();
          return (
            <div className={styles.when}>
              <div className={styles.whenFields}>
                <div className={styles.date}>
                  <DatePickerField
                    label="Clinical date"
                    value={zoned ? toCalendarDate(zoned) : null}
                    onChange={(date) => {
                      if (!date || !zoned) return field.onChange('');
                      const next = toCalendarDateTime(toCalendarDate(date), toTime(zoned));
                      field.onChange(isoFromZoned(toZoned(next, timeZone)));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    isInvalid={Boolean(fieldState.error)}
                  />
                </div>
                <div className={styles.time}>
                  <TimeFieldInput
                    label="Time"
                    value={zoned ? toTime(zoned) : null}
                    onChange={(time) => {
                      if (!time || !zoned) return field.onChange('');
                      const next = toCalendarDateTime(
                        toCalendarDate(zoned),
                        toTime(zoned).set({ hour: time.hour, minute: time.minute }),
                      );
                      field.onChange(isoFromZoned(toZoned(next, timeZone)));
                    }}
                    onBlur={field.onBlur}
                    isInvalid={Boolean(fieldState.error)}
                  />
                </div>
              </div>
              <p className={styles.help}>
                Defaults to now. The clinical time can't be in the future.
              </p>
              {fieldState.error?.message && <InlineError>{fieldState.error.message}</InlineError>}
            </div>
          );
        }}
      />
      <Controller
        control={form.control}
        name="body"
        render={({ field, fieldState }) => (
          <TextField
            label="Note"
            multiline
            placeholder="What happened at this encounter?"
            description="Plain text, up to 5,000 characters. Line breaks are kept."
            maxLength={NOTE_MAX}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={(element) => {
              field.ref(element);
              bodyRef.current = element;
            }}
            error={fieldState.error?.message}
            {...(body.length >= COUNTER_SHOWS_AT
              ? { footer: `${body.length.toLocaleString()} / ${NOTE_MAX.toLocaleString()}` }
              : {})}
            footerTone={body.length >= COUNTER_WARNS_AT ? 'danger' : 'muted'}
          />
        )}
      />
      {failure && (
        <div className={styles.failure}>
          <InlineError>{failure}</InlineError>
          <Button onPress={() => void submit()}>Retry</Button>
        </div>
      )}
      <div className={styles.formActions}>
        <Button type="submit" variant="primary" isPending={addNote.isPending}>
          {addNote.isPending ? 'Adding…' : 'Add note'}
        </Button>
      </div>
    </form>
  );
}

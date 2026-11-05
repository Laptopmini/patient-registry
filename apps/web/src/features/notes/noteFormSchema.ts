import { getLocalTimeZone, now, parseAbsoluteToLocal } from '@internationalized/date';
import { z } from 'zod';
import { CreateNoteBody } from '../../api/generated/zod';

export const NOTE_MAX = 5000;
/** The counter appears once the note is within this many characters of the limit. */
export const COUNTER_THRESHOLD = 500;

/** ISO 8601 with an offset, truncated to the minute: `2026-11-05T13:30:00+01:00`. */
export const currentMinuteIso = () =>
  now(getLocalTimeZone())
    .set({ second: 0, millisecond: 0 })
    .toString()
    .replace(/\[.*\]$/, '');

export const zonedFromIso = (iso: string) => parseAbsoluteToLocal(iso);

export const isoFromZoned = (value: { toString(): string }) =>
  value.toString().replace(/\[.*\]$/, '');

/** The generated NoteIn schema, with friendlier messages and a "not in the future" rule. */
export const noteFormSchema = CreateNoteBody.extend({
  body: z
    .string()
    .trim()
    .min(1, 'Enter the note text.')
    .max(NOTE_MAX, `Notes can be at most ${NOTE_MAX.toLocaleString()} characters.`),
  recorded_at: z.iso
    .datetime({ offset: true, error: 'Enter the date and time of the encounter.' })
    .refine((value) => new Date(value).getTime() <= Date.now() + 60_000, {
      error: "The clinical time can't be in the future.",
    }),
});

export type NoteFormValues = z.input<typeof noteFormSchema>;

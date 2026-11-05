import type { BloodType, PatientStatus } from '../api/generated/model';

export const STATUS_LABELS: Record<PatientStatus, string> = {
  active: 'Active',
  follow_up: 'Follow-up',
  inactive: 'Inactive',
};

/** "AB−" with a real minus sign (U+2212), "O+", or "Unknown". */
export const bloodTypeLabel = (bloodType: BloodType) =>
  bloodType === 'unknown' ? 'Unknown' : bloodType.replace('-', '−');

/** "Last, First" for lists. */
export const listName = (p: { first_name: string; last_name: string }) =>
  `${p.last_name}, ${p.first_name}`;

/** "First Last" for headings. */
export const fullName = (p: { first_name: string; last_name: string }) =>
  `${p.first_name} ${p.last_name}`;

/** Parse a `YYYY-MM-DD` string as a local calendar date. */
const parseLocalDate = (value: string) => {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "78 y", or "18 mo" under two years, computed from the date of birth. */
export function formatAge(dateOfBirth: string, now: Date = new Date()): string {
  const dob = parseLocalDate(dateOfBirth);
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months -= 1;
  months = Math.max(months, 0);
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} y`;
}

// `undefined` locale: the user's own for month names and times. The order is always day,
// month, year ("27 Sep 1947"): Chrome's en-GB says "Sept", and en-US puts the month first.
const partsFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/** The short month name for a 1-based month number, with a trailing dot or "Sept" tidied to "Sep". */
export function monthShort(month: number): string {
  const part = partsFormat
    .formatToParts(new Date(2000, month - 1, 1))
    .find((p) => p.type === 'month');
  const name = (part?.value ?? String(month)).replace(/\.$/, '');
  return name === 'Sept' ? 'Sep' : name;
}

const formatParts = (date: Date) => {
  const parts = partsFormat.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${monthShort(date.getMonth() + 1)} ${get('year')}`;
};

export const formatDate = (value: string) =>
  formatParts(/^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value));

/** "13 Jul 2026, 23:30" in the user's time zone. */
export const formatDateTime = (value: string) => {
  const date = new Date(value);
  return `${formatParts(date)}, ${timeFormat.format(date)}`;
};

/** "13:02", for "Showing data from 13:02". */
export const formatTime = (value: string | number | Date) => timeFormat.format(new Date(value));

export const formatLastVisit = (value: string | null) => (value ? formatDate(value) : 'No visits');

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "3 days ago", "yesterday", "just now". */
export function formatRelative(value: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  // Never in the future: a timestamp ahead of "now" (clock skew) reads "just now".
  if (seconds > -60) return 'just now';
  const abs = -seconds;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (abs >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

const dayKey = (value: string) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Whether two timestamps fall on different calendar days in the user's time zone. */
export const onDifferentDays = (a: string, b: string) => dayKey(a) !== dayKey(b);

const longDateParts = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "Thursday, 5 November 2026". */
export function formatLongDate(date: Date): string {
  const parts = longDateParts.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')} ${get('year')}`;
}

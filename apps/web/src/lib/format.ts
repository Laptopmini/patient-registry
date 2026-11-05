import type { BloodType, PatientStatus } from '../api/generated/model';

export const STATUS_LABELS: Record<PatientStatus, string> = {
  active: 'Active',
  follow_up: 'Follow-up',
  inactive: 'Inactive',
};

export const bloodTypeLabel = (bloodType: BloodType) =>
  bloodType === 'unknown' ? 'Unknown' : bloodType;

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

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const formatDate = (value: string) =>
  dateFormat.format(/^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value));

export const formatDateTime = (value: string) => dateTimeFormat.format(new Date(value));

export const formatLastVisit = (value: string | null) => (value ? formatDate(value) : 'No visits');

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "3 days ago", "yesterday", "just now". */
export function formatRelative(value: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
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

/** Whether two ISO timestamps are more than a minute apart. */
export const differsByMoreThanAMinute = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) > 60_000;

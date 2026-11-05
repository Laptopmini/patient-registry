import { formatDate, formatDateTime, formatLongDate, formatRelative, monthShort } from './format';

describe('date formatting', () => {
  it('reads "27 Sep 1947" whatever the engine calls September', () => {
    expect(formatDate('1947-09-27')).toBe('27 Sep 1947');
    expect(monthShort(9)).toBe('Sep');
  });

  it('puts the day first and adds the time to date-times', () => {
    const value = new Date(2026, 6, 13, 23, 30).toISOString();
    expect(formatDateTime(value)).toMatch(/^13 Jul 2026, 23:30$|^13 Jul 2026, 11:30\s?PM$/);
  });

  it('writes the long date with the weekday', () => {
    expect(formatLongDate(new Date(2026, 10, 5))).toBe('Thursday, 5 November 2026');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-11-05T13:10:00Z');

  it('phrases the past', () => {
    expect(formatRelative('2026-07-05T13:10:00Z', now)).toBe('4 months ago');
  });

  it('never phrases the future: a later timestamp reads "just now"', () => {
    expect(formatRelative('2026-11-05T13:10:30Z', now)).toBe('just now');
    expect(formatRelative('2027-03-01T00:00:00Z', now)).toBe('just now');
  });
});

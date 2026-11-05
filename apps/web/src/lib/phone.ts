import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

/**
 * E.164 shown as "+1 415-555-0155": the country code, then the rest joined with hyphens.
 * Falls back to the stored value when it doesn't parse. Import this only from screens in
 * the patient detail chunk, so the phone metadata stays out of the entry bundle.
 */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  const [code, ...rest] = parsed.formatInternational().split(' ');
  return rest.length ? `${code} ${rest.join('-')}` : (code ?? e164);
}

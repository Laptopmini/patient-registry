import { z } from 'zod';
import type { BloodType, PatientIn, PatientOut, PatientStatus } from '../../../api/generated/model';
import {
  CreatePatientBody,
  createPatientBodyAddressOneCityMax,
  createPatientBodyAddressOneCountryRegExp,
  createPatientBodyAddressOneLine1Max,
  createPatientBodyAddressOneLine2OneMax,
  createPatientBodyAddressOnePostalCodeOneMax,
  createPatientBodyAddressOneRegionOneMax,
  createPatientBodyAllergiesItemNameMax,
  createPatientBodyAllergiesMax,
  createPatientBodyFirstNameMax,
  createPatientBodyLastNameMax,
} from '../../../api/generated/zod';

export const PHONE_HINT = 'Enter a phone number in international format, e.g. +1 212 555 0100';

/** What the inputs hold: always strings, with `''` meaning "left blank". */
export interface PatientFormValues {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  blood_type: BloodType;
  status: PatientStatus;
  allergies: { name: string }[];
  conditions: { name: string }[];
}

export const emptyPatientForm: PatientFormValues = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  email: '',
  phone: '',
  address: { line1: '', line2: '', city: '', region: '', postal_code: '', country: 'US' },
  blood_type: 'unknown',
  status: 'active',
  allergies: [],
  conditions: [],
};

export const toFormValues = (patient: PatientOut): PatientFormValues => ({
  first_name: patient.first_name,
  last_name: patient.last_name,
  date_of_birth: patient.date_of_birth,
  email: patient.email ?? '',
  phone: patient.phone ?? '',
  address: {
    line1: patient.address?.line1 ?? '',
    line2: patient.address?.line2 ?? '',
    city: patient.address?.city ?? '',
    region: patient.address?.region ?? '',
    postal_code: patient.address?.postal_code ?? '',
    country: patient.address?.country ?? 'US',
  },
  blood_type: patient.blood_type,
  status: patient.status,
  allergies: patient.allergies.map((a) => ({ name: a.name })),
  conditions: patient.conditions.map((c) => ({ name: c.name })),
});

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

/** Today as `YYYY-MM-DD` in the local time zone. */
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const requiredText = (max: number, what: string) =>
  z.string().trim().min(1, `Enter ${what}.`).max(max, `Use at most ${max} characters.`);

const optionalText = (max: number) =>
  z.preprocess((value) => {
    const blank = blankToNull(value);
    return typeof blank === 'string' ? blank.trim() : blank;
  }, z.string().max(max, `Use at most ${max} characters.`).nullable());

const phone = z.preprocess(
  (value) => {
    const blank = blankToNull(value);
    // Accept "+1 (212) 555-0100" and send "+12125550100".
    return typeof blank === 'string' ? blank.replace(/[\s().-]/g, '') : blank;
  },
  z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, PHONE_HINT)
    .nullable(),
);

const address = z.preprocess(
  (value) => {
    if (typeof value !== 'object' || value === null) return value;
    const a = value as Record<
      'line1' | 'line2' | 'city' | 'region' | 'postal_code' | 'country',
      unknown
    >;
    // An address with nothing filled in (apart from the default country) means "no address".
    if ([a.line1, a.line2, a.city, a.region, a.postal_code].every(isBlank)) return null;
    return {
      ...a,
      country: typeof a.country === 'string' ? a.country.trim().toUpperCase() : a.country,
    };
  },
  z
    .object({
      line1: requiredText(createPatientBodyAddressOneLine1Max, 'the first line of the address'),
      line2: optionalText(createPatientBodyAddressOneLine2OneMax),
      city: requiredText(createPatientBodyAddressOneCityMax, 'a city'),
      region: optionalText(createPatientBodyAddressOneRegionOneMax),
      postal_code: optionalText(createPatientBodyAddressOnePostalCodeOneMax),
      country: z
        .string()
        .regex(createPatientBodyAddressOneCountryRegExp, 'Use a two-letter country code, e.g. US.'),
    })
    .nullable(),
);

const namedItems = (max: number) =>
  z
    .array(z.object({ name: z.string().trim().min(1).max(createPatientBodyAllergiesItemNameMax) }))
    .max(max, `You can add up to ${max} items.`);

/**
 * The generated `PatientIn` schema, extended only for form UX: blank optional fields
 * become `null`, friendlier messages, a forgiving phone format and a date of birth that
 * can't be in the future.
 */
export const patientFormSchema = CreatePatientBody.extend({
  first_name: requiredText(createPatientBodyFirstNameMax, 'a first name'),
  last_name: requiredText(createPatientBodyLastNameMax, 'a last name'),
  date_of_birth: z
    .string()
    .min(1, 'Enter a date of birth.')
    .pipe(
      CreatePatientBody.shape.date_of_birth.refine((value) => value <= todayLocal(), {
        error: "The date of birth can't be in the future.",
      }),
    ),
  email: z.preprocess(
    blankToNull,
    z.email('Enter an email address like name@example.com.').nullable(),
  ),
  phone,
  address,
  allergies: namedItems(createPatientBodyAllergiesMax),
  conditions: namedItems(createPatientBodyAllergiesMax),
});

export type PatientFormOutput = z.output<typeof patientFormSchema>;

/** Compile-time check that the form output is a valid API request body. */
export const toPatientIn = (values: PatientFormOutput): PatientIn => values;

interface FlatError {
  /** The dotted field path, for example `address.city`. */
  name: string;
  message: string;
}

/** Flattens react-hook-form's nested errors object into a list for the error summary. */
export function flattenErrors(errors: unknown, prefix = ''): FlatError[] {
  if (typeof errors !== 'object' || errors === null) return [];
  const record = errors as { message?: unknown } & Record<string, unknown>;
  if (typeof record.message === 'string' && record.message !== '' && 'type' in record) {
    return [{ name: prefix, message: record.message }];
  }
  const out: FlatError[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === 'ref' || key === 'types') continue;
    out.push(...flattenErrors(value, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

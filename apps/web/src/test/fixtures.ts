import type {
  NoteOut,
  PatientListItem,
  PatientOut,
  PatientStatus,
  SummaryOut,
} from '../api/generated/model';

// Synthetic people only (names follow design/brief/04-sample-data.json). Not real data.
const NAMES: [string, string][] = [
  ['David', 'Maldonado'],
  ['Priya', 'Raman'],
  ['Maximiliana-Josephine', 'Vanderbilt-Okonkwo-Hargreaves'],
  ['Alice', 'Abernathy'],
  ['Bola', 'Adeyemi'],
  ['Chen', 'Wei'],
  ['Dara', 'Novak'],
  ['Elif', 'Yilmaz'],
  ['Farid', 'Haddad'],
  ['Grace', 'Okafor'],
];

const STATUSES: PatientStatus[] = ['active', 'follow_up', 'inactive'];

const age = (dob: string) => new Date().getFullYear() - Number(dob.slice(0, 4));

export const makePatient = (index: number, overrides: Partial<PatientOut> = {}): PatientOut => {
  const [first, last] = NAMES[index % NAMES.length] ?? ['Test', 'Person'];
  const dob = `${1950 + (index % 40)}-0${(index % 9) + 1}-15`;
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    first_name: index < NAMES.length ? first : `${first}${index}`,
    last_name: index < NAMES.length ? last : `${last}${index}`,
    date_of_birth: dob,
    age: age(dob),
    email: `person${index}@example.com`,
    phone: '+14155550155',
    address: {
      line1: '9264 Sherri Summit',
      line2: null,
      city: 'North Kyle',
      region: 'MH',
      postal_code: '44724',
      country: 'US',
    },
    blood_type: 'O+',
    status: STATUSES[index % 3] ?? 'active',
    allergies: index % 2 === 0 ? [{ name: 'Penicillin' }] : [],
    conditions: [{ name: 'Hypertension' }],
    last_visit: index % 4 === 3 ? null : '2026-08-19T03:00:00+00:00',
    version: 1,
    created_at: '2025-07-30T12:00:00+00:00',
    updated_at: '2025-07-30T12:00:00+00:00',
    ...overrides,
  };
};

export const toListItem = (p: PatientOut): PatientListItem => ({
  id: p.id,
  first_name: p.first_name,
  last_name: p.last_name,
  date_of_birth: p.date_of_birth,
  age: p.age,
  status: p.status,
  blood_type: p.blood_type,
  last_visit: p.last_visit,
});

/** 45 patients: three pages of 20 at the default page size. */
export const makePatients = (count = 45) => Array.from({ length: count }, (_, i) => makePatient(i));

export const makeNote = (
  patientId: string,
  n: number,
  overrides: Partial<NoteOut> = {},
): NoteOut => ({
  id: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  patient_id: patientId,
  recorded_at: `2026-08-${String(10 + n).padStart(2, '0')}T03:00:00+00:00`,
  body: `Seasonal vaccination administered, visit ${n}.`,
  created_at: `2026-08-${String(10 + n).padStart(2, '0')}T03:11:00+00:00`,
  ...overrides,
});

export const makeSummary = (
  patient: PatientOut,
  overrides: Partial<SummaryOut> = {},
): SummaryOut => ({
  patient_id: patient.id,
  name: `${patient.first_name} ${patient.last_name}`,
  age: patient.age,
  blood_type: patient.blood_type,
  conditions: patient.conditions.map((c) => c.name),
  allergies: patient.allergies.map((a) => a.name),
  narrative: 'First paragraph of the narrative.\nSecond paragraph of the narrative.',
  provider: 'template',
  note_count: 2,
  generated_at: '2026-11-05T10:00:00+00:00',
  ...overrides,
});

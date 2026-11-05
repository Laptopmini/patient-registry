import { randomUUID } from 'node:crypto';
import { type APIRequestContext, expect, type Page } from '@playwright/test';

/** A patient as the API returns it (only what the tests read). */
export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  version: number;
}

const unique = () => randomUUID().replace(/-/g, '').slice(0, 8);

/** A last name no seeded patient has, so searches only ever find this test's records. */
export const uniqueSurname = () => `Zq${unique()}`;

/** The body of a valid patient; tests override what they care about. All values are synthetic. */
export function patientBody(overrides: Record<string, unknown> = {}) {
  return {
    first_name: 'Testa',
    last_name: uniqueSurname(),
    date_of_birth: '1988-04-12',
    email: 'testa@example.com',
    phone: '+442071838750',
    address: null,
    blood_type: 'A+',
    status: 'active',
    allergies: [{ name: 'Penicillin' }],
    conditions: [{ name: 'Asthma' }],
    ...overrides,
  };
}

/** Creates a patient through the API, so a test never depends on seed data. */
export async function createPatient(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<Patient> {
  const response = await request.post('/api/patients', { data: patientBody(overrides) });
  expect(response.status()).toBe(201);
  return (await response.json()) as Patient;
}

/** Saves the patient again behind the browser's back, which bumps `version` (for the 412 tests). */
export async function bumpVersion(
  request: APIRequestContext,
  patient: Patient,
  changes: Record<string, unknown>,
) {
  const current = await request.get(`/api/patients/${patient.id}`);
  const body = (await current.json()) as Record<string, unknown> & { version: number };
  const { id, age, version, created_at, updated_at, last_visit, ...editable } = body;
  const response = await request.put(`/api/patients/${patient.id}`, {
    data: { ...editable, ...changes },
    headers: { 'If-Match': `"${version}"` },
  });
  expect(response.ok()).toBe(true);
}

export async function addNote(
  request: APIRequestContext,
  patientId: string,
  body: string,
  recordedAt = new Date(Date.now() - 3_600_000).toISOString(),
) {
  const response = await request.post(`/api/patients/${patientId}/notes`, {
    data: { recorded_at: recordedAt, body },
  });
  expect(response.status()).toBe(201);
}

export async function archivePatient(request: APIRequestContext, patientId: string) {
  const response = await request.delete(`/api/patients/${patientId}`);
  expect(response.ok()).toBe(true);
}

/** Waits for a screen: a heading, no busy skeleton, fonts loaded (so layout is stable). */
export async function ready(page: Page) {
  await page.locator('main h1').first().waitFor();
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
  await page.evaluate(() => document.fonts.ready);
}

/** Fills the wizard's first step: name and date of birth (typed into the localised segments). */
export async function fillIdentity(page: Page, first: string, last: string) {
  await page.getByRole('textbox', { name: /First name/ }).fill(first);
  await page.getByRole('textbox', { name: /Last name/ }).fill(last);
  await page.getByRole('spinbutton', { name: /day, Date of birth/i }).click();
  await page.keyboard.type('23022019');
}

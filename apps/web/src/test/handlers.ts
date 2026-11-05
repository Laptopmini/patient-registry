import { HttpResponse, http } from 'msw';
import type { NoteIn, NoteOut, PatientIn, PatientOut } from '../api/generated/model';
import { makeNote, makePatient, makePatients, makeSummary, toListItem } from './fixtures';

export const problem = (status: number, detail: string, extra: object = {}) =>
  HttpResponse.json(
    { type: 'about:blank', title: detail, status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

/** In-memory "database" the default handlers read and write. Reset before each test. */
export const db = {
  patients: [] as PatientOut[],
  notes: new Map<string, NoteOut[]>(),
  /** Every list request's query string, for assertions. */
  listRequests: [] as URLSearchParams[],
};

export function resetDb() {
  db.patients = makePatients();
  db.notes = new Map();
  db.listRequests = [];
  const first = db.patients[0];
  if (first) {
    db.notes.set(first.id, [makeNote(first.id, 1), makeNote(first.id, 2)]);
  }
}

type SortKey = 'last_name' | 'age' | 'last_visit' | 'created_at';
const sorters: Record<SortKey, (a: PatientOut, b: PatientOut) => number> = {
  last_name: (a, b) => a.last_name.localeCompare(b.last_name),
  age: (a, b) => a.age - b.age,
  last_visit: (a, b) => (a.last_visit ?? '').localeCompare(b.last_visit ?? ''),
  created_at: (a, b) => a.created_at.localeCompare(b.created_at),
};

const API = '/api';

const param = (params: Record<string, unknown>, key: string) => String(params[key]);

export const handlers = [
  http.get(`${API}/patients`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams;
    db.listRequests.push(q);
    const term = (q.get('q') ?? '').toLowerCase();
    const status = q.get('status');
    const sort = q.get('sort') ?? 'last_name';
    const limit = Number(q.get('limit') ?? 20);
    const offset = Number(q.get('offset') ?? 0);

    let rows = db.patients.filter(
      (p) =>
        (!status || p.status === status) &&
        (!term || `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(term)),
    );
    const key = sort.replace(/^-/, '');
    const compare = sorters[key as SortKey] ?? sorters.last_name;
    rows = [...rows].sort(
      (a, b) => (compare ? compare(a, b) : 0) * (sort.startsWith('-') ? -1 : 1),
    );
    return HttpResponse.json({
      items: rows.slice(offset, offset + limit).map(toListItem),
      total: rows.length,
      limit,
      offset,
    });
  }),

  http.post(`${API}/patients`, async ({ request }) => {
    const body = (await request.json()) as PatientIn;
    const created = makePatient(900, {
      ...body,
      allergies: body.allergies ?? [],
      conditions: body.conditions ?? [],
      address: body.address ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      blood_type: body.blood_type ?? 'unknown',
      status: body.status ?? 'active',
      id: '99999999-0000-4000-8000-000000000001',
      last_visit: null,
    });
    db.patients.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${API}/patients/:id`, ({ params }) => {
    const patient = db.patients.find((p) => p.id === param(params, 'id'));
    return patient ? HttpResponse.json(patient) : problem(404, 'Patient not found.');
  }),

  http.put(`${API}/patients/:id`, async ({ params, request }) => {
    const patient = db.patients.find((p) => p.id === param(params, 'id'));
    if (!patient) return problem(404, 'Patient not found.');
    if (request.headers.get('If-Match') !== `"${patient.version}"`) {
      return problem(412, 'The record was changed since you loaded it.');
    }
    const body = (await request.json()) as PatientIn;
    const updated: PatientOut = {
      ...patient,
      ...body,
      allergies: body.allergies ?? [],
      conditions: body.conditions ?? [],
      address: body.address ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      blood_type: body.blood_type ?? 'unknown',
      status: body.status ?? 'active',
      version: patient.version + 1,
    };
    db.patients = db.patients.map((p) => (p.id === patient.id ? updated : p));
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/patients/:id`, ({ params, request }) => {
    const patient = db.patients.find((p) => p.id === param(params, 'id'));
    if (!patient) return problem(404, 'Patient not found.');
    if (request.headers.get('If-Match') !== `"${patient.version}"`) {
      return problem(412, 'The record was changed since you loaded it.');
    }
    db.patients = db.patients.filter((p) => p.id !== patient.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/patients/:id/notes`, ({ params }) => {
    const id = param(params, 'id');
    if (!db.patients.some((p) => p.id === id)) return problem(404, 'Patient not found.');
    return HttpResponse.json({ items: db.notes.get(id) ?? [] });
  }),

  http.post(`${API}/patients/:id/notes`, async ({ params, request }) => {
    const id = param(params, 'id');
    const body = (await request.json()) as NoteIn;
    const note: NoteOut = {
      id: crypto.randomUUID(),
      patient_id: id,
      recorded_at: body.recorded_at,
      body: body.body,
      created_at: new Date().toISOString(),
    };
    db.notes.set(id, [note, ...(db.notes.get(id) ?? [])]);
    return HttpResponse.json(note, { status: 201 });
  }),

  http.delete(`${API}/patients/:id/notes/:noteId`, ({ params }) => {
    const id = param(params, 'id');
    db.notes.set(
      id,
      (db.notes.get(id) ?? []).filter((n) => n.id !== param(params, 'noteId')),
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/patients/:id/summary`, ({ params }) => {
    const patient = db.patients.find((p) => p.id === param(params, 'id'));
    if (!patient) return problem(404, 'Patient not found.');
    return HttpResponse.json(
      makeSummary(patient, { note_count: db.notes.get(patient.id)?.length ?? 0 }),
    );
  }),
];

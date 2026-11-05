import type { QueryClient } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { getGetPatientQueryOptions } from '../../../api/generated/client';
import { isApiError } from '../../../api/http';

/**
 * Route loader helper: prefetches the patient. An unknown, archived or malformed id
 * (404 or 422 from the API) renders the Not-found page inside the shell.
 */
export async function ensurePatient(queryClient: QueryClient, patientId: string) {
  try {
    await queryClient.ensureQueryData(getGetPatientQueryOptions(patientId));
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 422)) throw notFound();
    throw error;
  }
}

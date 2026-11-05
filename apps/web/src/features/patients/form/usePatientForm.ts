import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { type FieldPath, type Resolver, useForm } from 'react-hook-form';
import {
  createPatient,
  getGetPatientQueryKey,
  getGetPatientQueryOptions,
  type getPatientResponse,
  replacePatient,
} from '../../../api/generated/client';
import type { PatientOut } from '../../../api/generated/model';
import { isApiError, isNetworkError } from '../../../api/http';
import { ifMatch, invalidatePatient, invalidatePatientLists } from '../../../api/invalidate';
import { unwrap } from '../../../api/unwrap';
import type { ErrorSummaryItem } from '../../../components/ui/ErrorSummary';
import { showToast } from '../../../lib/toast';
import { fieldLabel } from './fieldLabels';
import { fieldId } from './fields';
import {
  emptyPatientForm,
  flattenErrors,
  type PatientFormOutput,
  type PatientFormValues,
  patientFormSchema,
  toFormValues,
  toPatientIn,
} from './patientFormSchema';

export type SubmitError = 'offline' | 'network' | 'server';

/** The ids of the error summary items for the given errors, as `{ fieldId, label, message }`. */
export function summaryItems(errors: { name: string; message: string }[]): ErrorSummaryItem[] {
  return errors.map((error) => ({
    fieldId: fieldId(error.name.replace(/\.\d+(\..*)?$/, '')),
    label: fieldLabel(error.name),
    message: error.message,
  }));
}

/**
 * Everything the create wizard and the edit page share: the form (one object, kept in
 * memory only), the save request with its error handling (server 422 onto fields, 412
 * conflict, network failure that keeps the values), and the "saved" flag that turns the
 * unsaved-changes guard off.
 */
export function usePatientForm(patient?: PatientOut) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isEdit = patient !== undefined;

  const form = useForm<PatientFormValues, unknown, PatientFormOutput>({
    resolver: zodResolver(patientFormSchema) as unknown as Resolver<
      PatientFormValues,
      unknown,
      PatientFormOutput
    >,
    mode: 'onBlur',
    // The error summary takes focus instead of the first invalid field.
    shouldFocusError: false,
    defaultValues: patient ? toFormValues(patient) : emptyPatientForm,
  });

  // The version we loaded (or last reloaded). It is what PUT sends in If-Match.
  const [version, setVersion] = useState(patient?.version ?? 0);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [conflict, setConflict] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  // Set just before navigating away after a successful save, so the guard lets it through.
  const savedRef = useRef(false);

  const save = useMutation({
    mutationFn: async ({
      values,
      baseVersion,
    }: {
      values: PatientFormOutput;
      baseVersion: number;
    }) =>
      patient
        ? unwrap(
            await replacePatient(patient.id, toPatientIn(values), {
              headers: ifMatch(baseVersion),
            }),
          )
        : unwrap(await createPatient(toPatientIn(values))),
  });

  /** Returns the field paths the server rejected (empty when the save worked or failed otherwise). */
  const submitWith = async (values: PatientFormOutput, baseVersion: number) => {
    setSubmitError(null);
    try {
      const saved = await save.mutateAsync({ values, baseVersion });
      // Seed the detail cache so the next page renders instantly.
      const cached: getPatientResponse = { data: saved, status: 200, headers: new Headers() };
      queryClient.setQueryData(getGetPatientQueryKey(saved.id), cached);
      void invalidatePatientLists(queryClient);
      if (isEdit) void invalidatePatient(queryClient, saved.id);
      showToast(isEdit ? 'Changes saved' : 'Patient created');
      savedRef.current = true;
      await navigate({ to: '/patients/$patientId', params: { patientId: saved.id } });
      return [];
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        // The server rejected something the client accepted: show it on the same fields.
        const fields = Object.keys(error.fieldErrors);
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as FieldPath<PatientFormValues>, { type: 'server', message });
        }
        setShowSummary(true);
        return fields;
      }
      if (isApiError(error) && error.status === 412) {
        setConflict(true);
      } else if (isNetworkError(error)) {
        // Offline: the banner under the header says so, and the values stay in the form.
        setSubmitError(navigator.onLine ? 'network' : 'offline');
      } else {
        setSubmitError('server');
      }
      return [];
    }
  };

  const fetchLatest = async (id: string) =>
    unwrap(await queryClient.fetchQuery({ ...getGetPatientQueryOptions(id), staleTime: 0 }));

  const reloadTheirs = async () => {
    if (!patient) return;
    setResolvingConflict(true);
    try {
      const latest = await fetchLatest(patient.id);
      form.reset(toFormValues(latest));
      setVersion(latest.version);
      setShowSummary(false);
      setConflict(false);
    } catch {
      setConflict(false);
      setSubmitError('network');
    } finally {
      setResolvingConflict(false);
    }
  };

  const overwriteWithMine = async (onInvalid: () => void) => {
    if (!patient) return;
    setResolvingConflict(true);
    try {
      const latest = await fetchLatest(patient.id);
      setVersion(latest.version);
      setConflict(false);
      await form.handleSubmit((values) => submitWith(values, latest.version), onInvalid)();
    } catch {
      setConflict(false);
      setSubmitError('network');
    } finally {
      setResolvingConflict(false);
    }
  };

  const errors = flattenErrors(form.formState.errors);

  return {
    form,
    errors,
    isEdit,
    version,
    isSaving: save.isPending,
    submitError,
    conflict,
    resolvingConflict,
    showSummary,
    setShowSummary,
    submitWith,
    reloadTheirs,
    overwriteWithMine,
    savedRef,
    /** True while there are edits that have not been saved. */
    isDirty: form.formState.isDirty,
  };
}

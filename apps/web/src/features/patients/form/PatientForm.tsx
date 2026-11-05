import { zodResolver } from '@hookform/resolvers/zod';
import { parseDate } from '@internationalized/date';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { type Control, Controller, type FieldPath, type Resolver, useForm } from 'react-hook-form';
import {
  createPatient,
  getGetPatientQueryKey,
  getGetPatientQueryOptions,
  type getPatientResponse,
  replacePatient,
} from '../../../api/generated/client';
import type { BloodType, PatientOut, PatientStatus } from '../../../api/generated/model';
import { isApiError, isNetworkError } from '../../../api/http';
import { ifMatch, invalidatePatient, invalidatePatientLists } from '../../../api/invalidate';
import { unwrap } from '../../../api/unwrap';
import { Banner } from '../../../components/ui/Banner';
import { Button, buttonClass } from '../../../components/ui/Button';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import fieldStyles from '../../../components/ui/Field.module.css';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField, type TextFieldProps } from '../../../components/ui/TextField';
import { showToast } from '../../../lib/toast';
import { ConflictDialog } from './ConflictDialog';
import { ErrorSummary } from './ErrorSummary';
import styles from './PatientForm.module.css';
import {
  emptyPatientForm,
  flattenErrors,
  type PatientFormOutput,
  type PatientFormValues,
  PHONE_HINT,
  patientFormSchema,
  toFormValues,
  toPatientIn,
} from './patientFormSchema';
import { TagField } from './TagField';

const BLOOD_TYPES: SelectOption<BloodType>[] = [
  ...(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((id) => ({
    id,
    label: id,
  })),
  { id: 'unknown', label: 'Unknown' },
];

const STATUSES: SelectOption<PatientStatus>[] = [
  { id: 'active', label: 'Active' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'inactive', label: 'Inactive' },
];

type TextFieldName = Exclude<
  FieldPath<PatientFormValues>,
  | 'allergies'
  | 'conditions'
  | 'blood_type'
  | 'status'
  | 'date_of_birth'
  | `${string}.${number}.${string}`
>;

interface FormTextProps
  extends Pick<TextFieldProps, 'description' | 'autoComplete' | 'inputMode' | 'optional' | 'type'> {
  control: PatientControl;
  name: TextFieldName;
  label: string;
}

/** A text input registered with react-hook-form, with its error wired to the field. */
function FormText({ control, name, label, ...rest }: FormTextProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div data-field={name}>
          <TextField
            {...rest}
            label={label}
            value={field.value as string}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={field.ref}
            error={fieldState.error?.message}
          />
        </div>
      )}
    />
  );
}

export type PatientControl = Control<PatientFormValues, unknown, PatientFormOutput>;

type SubmitError = 'network' | 'server';

interface PatientFormProps {
  /** Present when editing; absent when creating. */
  patient?: PatientOut;
}

export function PatientForm({ patient }: PatientFormProps) {
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
  const { control, formState } = form;

  // The version we loaded (or last reloaded). It is what PUT sends in If-Match.
  const [version, setVersion] = useState(patient?.version ?? 0);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [conflict, setConflict] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const [focusSummary, setFocusSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const summaryRef = useRef<HTMLElement>(null);

  const errors = flattenErrors(formState.errors);

  // After a failed submit, move focus to the summary once it is on screen.
  useEffect(() => {
    if (focusSummary && errors.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
      setFocusSummary(false);
    }
  }, [focusSummary, errors.length]);

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

  const submitWith = async (values: PatientFormOutput, baseVersion: number) => {
    setSubmitError(null);
    try {
      const saved = await save.mutateAsync({ values, baseVersion });
      // Seed the detail cache so the next page renders instantly.
      const cached: getPatientResponse = {
        data: saved,
        status: 200,
        headers: new Headers(),
      };
      queryClient.setQueryData(getGetPatientQueryKey(saved.id), cached);
      void invalidatePatientLists(queryClient);
      if (isEdit) void invalidatePatient(queryClient, saved.id);
      showToast(isEdit ? 'Patient saved' : 'Patient created');
      await navigate({ to: '/patients/$patientId', params: { patientId: saved.id } });
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        // The server rejected something the client accepted: show it on the same fields.
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as FieldPath<PatientFormValues>, { type: 'server', message });
        }
        setShowSummary(true);
        setFocusSummary(true);
      } else if (isApiError(error) && error.status === 412) {
        setConflict(true);
      } else {
        // Network or unexpected failure. The form is never reset, so nothing is lost.
        setSubmitError(isNetworkError(error) ? 'network' : 'server');
      }
    }
  };

  const submit = form.handleSubmit(
    (values) => submitWith(values, version),
    () => {
      setShowSummary(true);
      setFocusSummary(true);
    },
  );

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

  const overwriteWithMine = async () => {
    if (!patient) return;
    setResolvingConflict(true);
    try {
      const latest = await fetchLatest(patient.id);
      setVersion(latest.version);
      setConflict(false);
      await form.handleSubmit((values) => submitWith(values, latest.version))();
    } catch {
      setConflict(false);
      setSubmitError('network');
    } finally {
      setResolvingConflict(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className={styles.form} aria-label="Patient details">
      {showSummary && errors.length > 0 && <ErrorSummary errors={errors} summaryRef={summaryRef} />}

      {submitError && (
        <Banner
          tone="error"
          role="alert"
          action={
            <Button variant="primary" onPress={() => void submit()}>
              Retry
            </Button>
          }
        >
          {submitError === 'network'
            ? "Couldn't reach the server. Your changes are kept."
            : 'Something went wrong while saving. Your changes are kept.'}
        </Banner>
      )}

      <fieldset className={fieldStyles.group}>
        <legend>Personal</legend>
        <div className={fieldStyles.row}>
          <FormText
            control={control}
            name="first_name"
            label="First name"
            autoComplete="given-name"
          />
          <FormText
            control={control}
            name="last_name"
            label="Last name"
            autoComplete="family-name"
          />
        </div>
        <Controller
          control={control}
          name="date_of_birth"
          render={({ field, fieldState }) => (
            <div data-field="date_of_birth">
              <DatePickerField
                label="Date of birth"
                value={field.value ? parseDate(field.value) : null}
                onChange={(value) => field.onChange(value ? value.toString() : '')}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
              />
            </div>
          )}
        />
        <div className={fieldStyles.row}>
          <FormText
            control={control}
            name="email"
            label="Email"
            optional
            inputMode="email"
            autoComplete="email"
          />
          <FormText
            control={control}
            name="phone"
            label="Phone"
            optional
            inputMode="tel"
            autoComplete="tel"
            description={PHONE_HINT}
          />
        </div>

        <fieldset className={fieldStyles.group}>
          <legend>Address</legend>
          <FormText
            control={control}
            name="address.line1"
            label="Address line 1"
            description="Leave the whole address blank to skip it. If you fill in any part, line 1 and city are required."
            autoComplete="address-line1"
          />
          <FormText
            control={control}
            name="address.line2"
            label="Address line 2"
            optional
            autoComplete="address-line2"
          />
          <div className={fieldStyles.row}>
            <FormText
              control={control}
              name="address.city"
              label="City"
              autoComplete="address-level2"
            />
            <FormText
              control={control}
              name="address.region"
              label="Region"
              optional
              autoComplete="address-level1"
            />
          </div>
          <div className={fieldStyles.row}>
            <FormText
              control={control}
              name="address.postal_code"
              label="Postal code"
              optional
              autoComplete="postal-code"
            />
            <FormText
              control={control}
              name="address.country"
              label="Country"
              description="Two-letter code, for example US"
              autoComplete="country"
            />
          </div>
        </fieldset>
      </fieldset>

      <fieldset className={fieldStyles.group}>
        <legend>Medical</legend>
        <div className={fieldStyles.row}>
          <Controller
            control={control}
            name="blood_type"
            render={({ field, fieldState }) => (
              <div data-field="blood_type">
                <SelectField
                  label="Blood type"
                  options={BLOOD_TYPES}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={fieldState.error?.message}
                />
              </div>
            )}
          />
          <Controller
            control={control}
            name="status"
            render={({ field, fieldState }) => (
              <div data-field="status">
                <SelectField
                  label="Status"
                  options={STATUSES}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  error={fieldState.error?.message}
                />
              </div>
            )}
          />
        </div>
        <TagField control={control} name="allergies" label="Allergies" noun="allergy" />
        <TagField control={control} name="conditions" label="Conditions" noun="condition" />
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" isDisabled={save.isPending}>
          {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create patient'}
        </Button>
        {patient ? (
          <Link
            to="/patients/$patientId"
            params={{ patientId: patient.id }}
            className={buttonClass()}
          >
            Cancel
          </Link>
        ) : (
          <Link to="/patients" className={buttonClass()}>
            Cancel
          </Link>
        )}
      </div>

      <ConflictDialog
        isOpen={conflict}
        isBusy={resolvingConflict}
        onReload={() => void reloadTheirs()}
        onOverwrite={() => void overwriteWithMine()}
      />
    </form>
  );
}

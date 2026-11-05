import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { PatientOut } from '../../../api/generated/model';
import { Banner } from '../../../components/ui/Banner';
import { Button, buttonClass } from '../../../components/ui/Button';
import { ErrorSummary } from '../../../components/ui/ErrorSummary';
import fieldStyles from '../../../components/ui/Field.module.css';
import { fullName } from '../../../lib/format';
import { ConflictDialog } from './ConflictDialog';
import { AddressFields, MedicalFields, PersonalFields } from './fields';
import styles from './PatientForm.module.css';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { summaryItems, usePatientForm } from './usePatientForm';

/** The edit page's single form: Personal (with an optional address) and Medical. */
export function PatientForm({ patient }: { patient: PatientOut }) {
  const state = usePatientForm(patient);
  const { form, errors } = state;
  const [focusSummary, setFocusSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // After a failed submit, move focus to the summary once it is on screen.
  useEffect(() => {
    if (focusSummary && errors.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
      setFocusSummary(false);
    }
  }, [focusSummary, errors.length]);

  const onInvalid = () => {
    state.setShowSummary(true);
    setFocusSummary(true);
  };

  const submit = form.handleSubmit(async (values) => {
    const rejected = await state.submitWith(values, state.version);
    if (rejected.length > 0) setFocusSummary(true);
  }, onInvalid);

  return (
    <form onSubmit={submit} noValidate className={styles.form} aria-label="Edit patient details">
      <UnsavedChangesGuard
        isDirty={state.isDirty}
        savedRef={state.savedRef}
        pathname={`/patients/${patient.id}/edit`}
      />
      {state.showSummary && errors.length > 0 && (
        <ErrorSummary items={summaryItems(errors)} summaryRef={summaryRef} />
      )}

      {(state.submitError === 'network' || state.submitError === 'server') && (
        <Banner
          tone="error"
          role="alert"
          action={
            <Button variant="primary" onPress={() => void submit()}>
              Retry
            </Button>
          }
        >
          {state.submitError === 'network'
            ? "Couldn't reach the server. Your changes are kept."
            : 'Something went wrong while saving. Your changes are kept.'}
        </Banner>
      )}

      <p className={styles.note}>All fields are required unless marked optional.</p>

      <fieldset className={fieldStyles.group}>
        <legend>Personal</legend>
        <PersonalFields control={form.control} />
        <fieldset className={`${fieldStyles.group} ${fieldStyles.nested}`}>
          <legend>
            Address <span className={fieldStyles.optional}>(optional)</span>
          </legend>
          <AddressFields control={form.control} />
        </fieldset>
      </fieldset>

      <fieldset className={fieldStyles.group}>
        <legend>Medical</legend>
        <MedicalFields control={form.control} />
      </fieldset>

      <div className={styles.actions}>
        {state.submitError === 'offline' && (
          <p role="status" className={styles.offlineNote}>
            You’re offline. Your changes are kept; save again when you’re back online.
          </p>
        )}
        <Link
          to="/patients/$patientId"
          params={{ patientId: patient.id }}
          className={buttonClass()}
        >
          Cancel
        </Link>
        <Button type="submit" variant="primary" isPending={state.isSaving}>
          {state.isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <ConflictDialog
        isOpen={state.conflict}
        isBusy={state.resolvingConflict}
        patientName={fullName(patient)}
        onReload={() => void state.reloadTheirs()}
        onOverwrite={() => void state.overwriteWithMine(onInvalid)}
      />
    </form>
  );
}

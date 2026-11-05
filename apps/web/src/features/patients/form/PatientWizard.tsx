import { getRouteApi, Link, Navigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Banner } from '../../../components/ui/Banner';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { Button, buttonClass } from '../../../components/ui/Button';
import { Disclosure } from '../../../components/ui/Disclosure';
import { ErrorSummary } from '../../../components/ui/ErrorSummary';
import fieldStyles from '../../../components/ui/Field.module.css';
import { Stepper } from '../../../components/ui/Stepper';
import { useLayout } from '../../../lib/layout';
import { usePageTitle } from '../../../lib/usePageTitle';
import { AddressFields, MedicalFields, PersonalFields } from './fields';
import styles from './PatientWizard.module.css';
import { STEP_FIELDS, stepOfField } from './patientFormSchema';
import { ReviewStep } from './ReviewStep';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { summaryItems, usePatientForm } from './usePatientForm';

const route = getRouteApi('/patients/new');

const STEPS = [
  { label: 'Patient details', hint: 'Required' },
  { label: 'Address', hint: 'Optional' },
  { label: 'Medical', hint: 'Optional' },
  { label: 'Review', hint: 'Check and create' },
] as const;

const REVIEW = 4;

type Step = 1 | 2 | 3 | 4;

const TIPS: Record<Step, ReactNode[]> = {
  1: [
    <>
      Only <strong>name</strong> and <strong>date of birth</strong> are required. Everything else
      can be added now or later.
    </>,
    'Check the spelling of the name against an ID if you can. It’s how colleagues will search for this patient.',
    'Phone numbers need the country code, for example +1 212 555 0100.',
  ],
  2: [
    'Leave the address blank if you don’t have it. You can add it later.',
    'If you fill in any part of the address, line 1 and city are required.',
  ],
  3: [
    'Blood type stays Unknown until someone has confirmed it.',
    'Allergies appear at the top of every tab of the patient’s record, so add every one you know of.',
  ],
  4: [
    <>
      Use <strong>Edit</strong> on any section to go back. Nothing you’ve entered is lost.
    </>,
    'After you create the patient, you’ll go straight to their record, where you can add the first note.',
  ],
};

function Tips({ step, heading }: { step: Step; heading: boolean }) {
  return (
    <div className={styles.tipsBody}>
      {heading && (
        <h2 className={styles.tipsTitle}>
          <Info aria-hidden="true" />
          Tips for this step
        </h2>
      )}
      {TIPS[step].map((tip, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static copy
        <p key={index}>{tip}</p>
      ))}
    </div>
  );
}

/**
 * The create-patient wizard: four steps over one form object, so moving between steps
 * never loses data. `?step=` is the URL state; a step beyond the first incomplete one
 * redirects back to it. Each step validates on Continue and shows its own error summary.
 */
export function PatientWizard() {
  usePageTitle('New patient');
  const router = useRouter();
  const layout = useLayout();
  const { step: rawStep } = route.useSearch();
  const navigate = route.useNavigate();
  const step = rawStep as Step;

  const state = usePatientForm();
  const { form, errors } = state;
  const [completed, setCompleted] = useState<readonly number[]>([]);
  const [focusSummary, setFocusSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLElement | null>(null);
  const setStepRef = (element: HTMLElement | null) => {
    stepRef.current = element;
  };
  const shownStep = useRef(step);

  const firstIncomplete = ([1, 2, 3] as const).find((n) => !completed.includes(n)) ?? REVIEW;

  // Moving to another step puts focus on the step, so keyboard and screen reader users land on it.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    stepRef.current?.focus();
  }, [step]);

  // After a failed Continue, move focus to the summary once it is on screen.
  useEffect(() => {
    if (focusSummary && summaryRef.current) {
      summaryRef.current.focus();
      setFocusSummary(false);
    }
  }, [focusSummary]);

  const stepErrors = errors.filter((error) => stepOfField(error.name) === step);
  const goTo = (next: number) => void navigate({ search: { step: next } });

  const showErrors = () => {
    state.setShowSummary(true);
    setFocusSummary(true);
  };

  /** Jumps to the earliest step with errors, marking the steps before it as done. */
  const goToFirstError = (names: string[]) => {
    const target = Math.min(...names.map(stepOfField));
    setCompleted((previous) => [...new Set([...previous, ...[1, 2, 3].filter((n) => n < target)])]);
    state.setShowSummary(true);
    setFocusSummary(true);
    if (target !== step) goTo(target);
  };

  const markDone = (steps: number[]) =>
    setCompleted((previous) => [...new Set([...previous, ...steps])]);

  const next = async () => {
    const ok = await form.trigger([...STEP_FIELDS[step as 1 | 2 | 3]]);
    if (!ok) return showErrors();
    markDone([step]);
    state.setShowSummary(false);
    goTo(step + 1);
  };

  /** From step 1: check everything, then go straight to the review. */
  const skip = async () => {
    const ok = await form.trigger();
    if (!ok) {
      const names = flattenNames();
      return goToFirstError(names);
    }
    markDone([1, 2, 3]);
    state.setShowSummary(false);
    goTo(REVIEW);
  };

  const flattenNames = () => {
    // `trigger()` has just updated the form state; read the freshest errors.
    const names: string[] = [];
    const walk = (value: unknown, prefix: string) => {
      if (typeof value !== 'object' || value === null) return;
      const record = value as { message?: unknown } & Record<string, unknown>;
      if (typeof record.message === 'string' && 'type' in record) {
        names.push(prefix);
        return;
      }
      for (const [key, child] of Object.entries(record)) {
        if (key !== 'ref') walk(child, prefix ? `${prefix}.${key}` : key);
      }
    };
    walk(form.formState.errors, '');
    return names.length ? names : ['first_name'];
  };

  const create = form.handleSubmit(
    async (values) => {
      const rejected = await state.submitWith(values, 0);
      if (rejected.length > 0) goToFirstError(rejected);
    },
    () => goToFirstError(flattenNames()),
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step === REVIEW) void create();
    else void next();
  };

  if (step > firstIncomplete) {
    return <Navigate to="/patients/new" search={{ step: firstIncomplete }} replace />;
  }

  const stepHref = (n: number) =>
    router.buildLocation({ to: '/patients/new', search: { step: n } }).href;

  const stepper = (
    <Stepper
      label="Steps to create a patient"
      current={step}
      steps={STEPS.map((s, index) => ({
        ...s,
        done: completed.includes(index + 1),
        href: stepHref(index + 1),
      }))}
    />
  );

  return (
    <>
      <UnsavedChangesGuard
        isDirty={state.isDirty}
        savedRef={state.savedRef}
        pathname="/patients/new"
      />
      <Breadcrumbs items={[{ label: 'Patients', href: '/patients' }, { label: 'New patient' }]} />
      <h1 tabIndex={-1}>New patient</h1>

      <div className={styles.layout}>
        <div className={styles.main}>
          {stepper}
          {layout !== 'wide' && (
            <Disclosure title="Tips for this step" icon={<Info aria-hidden="true" />}>
              <Tips step={step} heading={false} />
            </Disclosure>
          )}

          <form noValidate onSubmit={onSubmit} aria-label="New patient" className={styles.form}>
            {state.showSummary && stepErrors.length > 0 && (
              <ErrorSummary
                items={summaryItems(stepErrors)}
                summaryRef={summaryRef}
                blocks={step === REVIEW ? 'save' : 'continue'}
              />
            )}
            {(state.submitError === 'network' || state.submitError === 'server') && (
              <Banner tone="error" role="alert">
                {state.submitError === 'network'
                  ? "Couldn't reach the server. Your details are kept; try again."
                  : 'Something went wrong while saving. Your details are kept; try again.'}
              </Banner>
            )}
            {state.submitError === 'offline' && (
              <Banner tone="warning">
                You’re offline. Your details are kept; create the patient when you’re back online.
              </Banner>
            )}

            {step === 1 && (
              <fieldset ref={setStepRef} tabIndex={-1} className={fieldStyles.group}>
                <legend>Patient details</legend>
                <PersonalFields control={form.control} />
              </fieldset>
            )}
            {step === 2 && (
              <fieldset ref={setStepRef} tabIndex={-1} className={fieldStyles.group}>
                <legend>Address</legend>
                <p className={styles.help}>
                  Leave the whole address blank to skip it. If you fill in any part, line 1 and city
                  are required.
                </p>
                <AddressFields control={form.control} />
              </fieldset>
            )}
            {step === 3 && (
              <fieldset ref={setStepRef} tabIndex={-1} className={fieldStyles.group}>
                <legend>Medical</legend>
                <MedicalFields control={form.control} />
              </fieldset>
            )}
            {step === REVIEW && (
              <div ref={setStepRef} tabIndex={-1} className={styles.review}>
                <ReviewStep control={form.control} />
              </div>
            )}

            <div className={styles.footer}>
              {step === 1 ? (
                <>
                  <Link to="/patients" className={`${buttonClass()} ${styles.back}`}>
                    Cancel
                  </Link>
                  <Button variant="link" onPress={() => void skip()} className={styles.skip}>
                    Skip optional steps and review
                  </Button>
                </>
              ) : (
                <Button
                  onPress={() => {
                    state.setShowSummary(false);
                    goTo(step - 1);
                  }}
                  className={styles.back}
                >
                  <ChevronLeft aria-hidden="true" />
                  Back
                </Button>
              )}
              {step === REVIEW ? (
                <Button type="submit" variant="primary" isPending={state.isSaving}>
                  {state.isSaving ? 'Saving…' : 'Create patient'}
                </Button>
              ) : (
                <Button type="submit" variant="primary">
                  Continue
                  <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </form>
        </div>

        {layout === 'wide' && (
          <aside aria-label="Tips" className={styles.tips}>
            <Tips step={step} heading />
          </aside>
        )}
      </div>
    </>
  );
}

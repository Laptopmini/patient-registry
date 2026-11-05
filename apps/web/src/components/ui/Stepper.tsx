import { Check } from 'lucide-react';
import { Link } from 'react-aria-components';
import { useLayout } from '../../lib/layout';
import { ProgressBar } from './ProgressBar';
import styles from './Stepper.module.css';

export interface StepperStep {
  label: string;
  /** The small line under the label: "Required", "Optional", "Check and create". */
  hint: string;
  /** Finished steps link back to their step. */
  href?: string;
  done: boolean;
}

interface StepperProps {
  /** Accessible name of the list, for example "Steps to create a patient". */
  label: string;
  steps: readonly StepperStep[];
  /** 1-based number of the current step. */
  current: number;
}

/**
 * Create-patient progress. Wide and medium: an ordered list of four items, the current one
 * marked `aria-current="step"` and finished ones linking back. Compact: "Step 2 of 4", the
 * step name and a thin progress bar. Progress never animates (it would need width).
 */
export function Stepper({ label, steps, current }: StepperProps) {
  const layout = useLayout();
  const currentStep = steps[current - 1];

  if (layout === 'compact') {
    return (
      <div className={styles.compact}>
        <p className={styles.compactText}>
          <span className={styles.compactCount}>
            Step {current} of {steps.length}
          </span>
          <span className={styles.compactName}>{currentStep?.label}</span>
        </p>
        <ProgressBar
          label="Progress"
          value={current}
          maxValue={steps.length}
          valueText={`Step ${current} of ${steps.length}`}
        />
      </div>
    );
  }

  return (
    <ol aria-label={label} className={styles.list}>
      {steps.map((step, index) => {
        const number = index + 1;
        const state = number === current ? 'current' : step.done ? 'done' : 'upcoming';
        return (
          <li
            key={step.label}
            className={`${styles.item} ${state === 'upcoming' ? '' : styles[state]}`}
            {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}
          >
            <span className={styles.marker} aria-hidden="true">
              {state === 'done' ? <Check strokeWidth={2.4} /> : number}
            </span>
            <span className={styles.text}>
              {state === 'done' && step.href ? (
                <Link href={step.href} className={styles.link}>
                  {step.label}
                </Link>
              ) : (
                <span className={styles.label}>{step.label}</span>
              )}
              <span className={styles.hint}>{step.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

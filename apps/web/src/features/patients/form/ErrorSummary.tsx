import type { Ref } from 'react';
import type { FlatErrorItem } from './fieldLabels';
import { fieldLabel } from './fieldLabels';
import styles from './PatientForm.module.css';

/** Moves keyboard focus into the field a summary link points to. */
function focusField(name: string) {
  const root = document.querySelector(`[data-field="${CSS.escape(name)}"]`);
  const target = root?.querySelector<HTMLElement>(
    'input, textarea, button, [role="spinbutton"], [tabindex="0"]',
  );
  target?.focus();
}

interface ErrorSummaryProps {
  errors: FlatErrorItem[];
  summaryRef: Ref<HTMLElement>;
}

/** Lists every error as a link to its field. Receives focus after a failed submit. */
export function ErrorSummary({ errors, summaryRef }: ErrorSummaryProps) {
  return (
    <section
      ref={summaryRef}
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      className={styles.summary}
    >
      <h2 id="error-summary-title">
        {errors.length === 1 ? 'There is 1 problem' : `There are ${errors.length} problems`}
      </h2>
      <ul>
        {errors.map((error) => (
          <li key={`${error.name}:${error.message}`}>
            <a
              href={`#field-${error.name}`}
              onClick={(event) => {
                event.preventDefault();
                focusField(error.name.replace(/\.\d+\..*$/, '').replace(/\.\d+$/, ''));
              }}
            >
              {fieldLabel(error.name)}: {error.message}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

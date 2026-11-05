import { CircleAlert } from 'lucide-react';
import type { Ref } from 'react';
import styles from './ErrorSummary.module.css';

export interface ErrorSummaryItem {
  /** The id of the field the item points to. */
  fieldId: string;
  /** The field's exact label; shown in bold before the message. */
  label: string;
  message: string;
}

interface ErrorSummaryProps {
  items: readonly ErrorSummaryItem[];
  /** Give the summary focus on submit by passing a ref and calling `focus()`. */
  summaryRef?: Ref<HTMLDivElement>;
  /** What the problems block: "save" (the default) or "continue" in the wizard. */
  blocks?: 'save' | 'continue';
}

const FOCUSABLE = 'input, textarea, button, [role="spinbutton"], [tabindex="0"]';

/** Moves keyboard focus to the field a summary link points to (or the first control inside it). */
function focusField(fieldId: string) {
  const target = document.getElementById(fieldId);
  if (!target) return;
  if (target.matches(FOCUSABLE)) target.focus();
  else target.querySelector<HTMLElement>(FOCUSABLE)?.focus();
}

/** "2 problems to fix before you can save", each item a link: **Label** – message. */
export function ErrorSummary({ items, summaryRef, blocks = 'save' }: ErrorSummaryProps) {
  return (
    <div ref={summaryRef} role="alert" tabIndex={-1} className={styles.summary}>
      <h2 className={styles.title}>
        <CircleAlert />
        {items.length === 1
          ? `1 problem to fix before you can ${blocks}`
          : `${items.length} problems to fix before you can ${blocks}`}
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={`${item.fieldId}:${item.message}`}>
            <a
              href={`#${item.fieldId}`}
              className={styles.link}
              onClick={(event) => {
                event.preventDefault();
                focusField(item.fieldId);
              }}
            >
              <strong>{item.label}</strong> – {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

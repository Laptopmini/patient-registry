import styles from './CountPill.module.css';

interface CountPillProps {
  count: number;
  /** `allergy` is the red pill; `neutral` is used on the Notes tab and for Conditions. */
  tone?: 'neutral' | 'allergy';
  /** Overrides the accessible name, for example "6 notes". */
  label?: string;
}

/** A number in a pill, never in brackets. */
export function CountPill({ count, tone = 'neutral', label }: CountPillProps) {
  return (
    <span
      className={`${styles.pill} ${tone === 'allergy' ? styles.allergy : styles.neutral}`}
      {...(label ? { 'aria-label': label, role: 'img' } : {})}
    >
      {count}
    </span>
  );
}

import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import styles from './AllergyStrip.module.css';
import { CountPill } from './CountPill';

interface AllergyStripProps {
  allergies: readonly string[];
  /** Set when the strip is an anchor target for the compact pinned bar. */
  id?: string;
}

/**
 * Safety-critical: always shown directly under the patient header block, above the tabs, on
 * every tab. With no allergies it says so in a neutral strip; it is never hidden.
 */
export function AllergyStrip({ allergies, id }: AllergyStripProps) {
  const headingId = useId();

  if (allergies.length === 0) {
    return (
      <section
        {...(id ? { id } : {})}
        aria-labelledby={headingId}
        className={`${styles.strip} ${styles.none}`}
      >
        <h2 id={headingId} className={styles.heading}>
          <ShieldCheck className={styles.headingIcon} />
          No known allergies
        </h2>
      </section>
    );
  }

  return (
    <section {...(id ? { id } : {})} aria-labelledby={headingId} className={styles.strip}>
      <h2 id={headingId} className={styles.heading}>
        <TriangleAlert className={styles.headingIcon} />
        Allergies
        <CountPill count={allergies.length} tone="allergy" />
      </h2>
      <ul className={styles.chips}>
        {allergies.map((name) => (
          <li key={name} className={styles.chip}>
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

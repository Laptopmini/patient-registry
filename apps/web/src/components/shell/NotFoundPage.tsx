import { Link } from '@tanstack/react-router';
import { usePageTitle } from '../../lib/usePageTitle';
import { buttonClass } from '../ui/Button';
import styles from './NotFoundPage.module.css';

/** A document with a magnifier, drawn with tokens only. Decorative. */
function Illustration() {
  return (
    <svg
      className={styles.illustration}
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="48" cy="48" r="48" className={styles.disc} />
      <path
        d="M30 24h26a4 4 0 0 1 4 4v18M30 24a4 4 0 0 0-4 4v38a4 4 0 0 0 4 4h14M30 24h0"
        className={styles.line}
      />
      <path d="M34 36h14M34 44h10" className={styles.line} />
      <circle cx="58" cy="58" r="9" className={styles.line} />
      <path d="m65 65 8 8" className={styles.line} />
    </svg>
  );
}

/** Rendered inside the shell for unknown URLs and for unknown or archived patients. */
export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <section aria-labelledby="not-found-title" className={styles.page}>
      <Illustration />
      <h1 id="not-found-title" tabIndex={-1} className={styles.title}>
        We couldn’t find that page
      </h1>
      <p className={styles.body}>
        The link may be out of date, or the patient record may have been archived.
      </p>
      <div className={styles.actions}>
        <Link to="/patients" className={buttonClass('primary')}>
          Go to patients
        </Link>
        <Link to="/" className={buttonClass()}>
          Dashboard
        </Link>
      </div>
    </section>
  );
}

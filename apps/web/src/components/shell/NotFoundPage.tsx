import { Link } from '@tanstack/react-router';
import { buttonClass } from '../ui/Button';
import styles from './Page.module.css';

/** Rendered inside the shell for unknown URLs and for unknown or archived patients. */
export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title" tabIndex={-1}>
        We can't find that page
      </h1>
      <p>It may have moved, or the patient may have been archived.</p>
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

import type { PatientStatus } from '../../api/generated/model';
import { STATUS_LABELS } from '../../lib/format';
import styles from './StatusBadge.module.css';

/** Status is shown as text plus a distinct shape, never by colour alone. */
function StatusShape({ status }: { status: PatientStatus }) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {status === 'active' && <circle cx="8" cy="8" r="6" fill="currentColor" />}
      {status === 'follow_up' && <path d="M8 2 15 14H1z" fill="currentColor" />}
      {status === 'inactive' && (
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      )}
    </svg>
  );
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span className={styles.badge}>
      <StatusShape status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}

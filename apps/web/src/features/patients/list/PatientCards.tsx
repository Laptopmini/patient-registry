import { Link } from '@tanstack/react-router';
import type { PatientListItem } from '../../../api/generated/model';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatAge, formatLastVisit, listName } from '../../../lib/format';
import styles from './PatientList.module.css';

/** Compact layout: each card is one link. */
export function PatientCards({ items }: { items: PatientListItem[] }) {
  return (
    <ul className={styles.cards} aria-label="Patients">
      {items.map((patient) => (
        <li key={patient.id}>
          <Link
            to="/patients/$patientId"
            params={{ patientId: patient.id }}
            className={styles.card}
          >
            <span className={styles.cardName}>{listName(patient)}</span>
            <span className={styles.cardFacts}>
              <span>Age {formatAge(patient.date_of_birth)}</span>
              <span>Last visit: {formatLastVisit(patient.last_visit)}</span>
              <StatusBadge status={patient.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

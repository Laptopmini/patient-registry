import { GridList, GridListItem } from 'react-aria-components';
import type { PatientListItem } from '../../../api/generated/model';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatAge, formatDate, listName } from '../../../lib/format';
import styles from './PatientList.module.css';

/** Compact layout: each card is one link (a GridList item with an `href`). */
export function PatientCards({ items }: { items: PatientListItem[] }) {
  return (
    <GridList aria-label="Patients" layout="stack" className={styles.cards} items={items}>
      {(patient) => (
        <GridListItem
          id={patient.id}
          href={`/patients/${patient.id}`}
          textValue={listName(patient)}
          className={styles.patientCard}
        >
          <span className={styles.cardName}>{listName(patient)}</span>
          <span className={styles.cardMeta}>
            {formatAge(patient.date_of_birth)} · Born {formatDate(patient.date_of_birth)}
          </span>
          <span className={styles.cardFoot}>
            <span className={patient.last_visit ? undefined : styles.muted}>
              {patient.last_visit ? `Last visit ${formatDate(patient.last_visit)}` : 'No visits'}
            </span>
            <StatusBadge status={patient.status} />
          </span>
        </GridListItem>
      )}
    </GridList>
  );
}

import { Link } from '@tanstack/react-router';
import type { PatientOut } from '../../../api/generated/model';
import { CountPill } from '../../../components/ui/CountPill';
import { bloodTypeLabel, formatDate } from '../../../lib/format';
import { formatPhone } from '../../../lib/phone';
import styles from './Detail.module.css';

/** The clinical snapshot column: shown beside Notes and Summary at 1280px and up. */
export function Snapshot({ patient }: { patient: PatientOut }) {
  return (
    <aside aria-labelledby="snapshot-title" className={styles.snapshot}>
      <h2 id="snapshot-title">Clinical snapshot</h2>
      <dl className={styles.snapshotList}>
        <div>
          <dt>
            Conditions
            <CountPill count={patient.conditions.length} />
          </dt>
          <dd>
            {patient.conditions.length ? (
              <ul className={styles.snapshotConditions}>
                {patient.conditions.map((c) => (
                  <li key={c.name}>{c.name}</li>
                ))}
              </ul>
            ) : (
              <span className={styles.muted}>None recorded</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Blood type</dt>
          <dd className={styles.value}>{bloodTypeLabel(patient.blood_type)}</dd>
        </div>
        <div>
          <dt>Last visit</dt>
          <dd>
            {patient.last_visit ? (
              formatDate(patient.last_visit)
            ) : (
              <span className={styles.muted}>No visits</span>
            )}
          </dd>
        </div>
        {patient.phone && (
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${patient.phone}`}>{formatPhone(patient.phone)}</a>
            </dd>
          </div>
        )}
        {patient.email && (
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${patient.email}`}>{patient.email}</a>
            </dd>
          </div>
        )}
      </dl>
      <Link to="/patients/$patientId" params={{ patientId: patient.id }}>
        View full profile
      </Link>
    </aside>
  );
}

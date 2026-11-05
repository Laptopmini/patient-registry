import { TriangleAlert } from 'lucide-react';
import type { PatientOut } from '../../../api/generated/model';
import { CountPill } from '../../../components/ui/CountPill';
import { bloodTypeLabel, formatDate, STATUS_LABELS } from '../../../lib/format';
import { formatPhone } from '../../../lib/phone';
import styles from './Detail.module.css';

const regionNames = new Intl.DisplayNames(undefined, { type: 'region' });

const countryName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

export function ProfileTab({ patient }: { patient: PatientOut }) {
  const { address } = patient;
  return (
    <div className={styles.sections}>
      <section aria-labelledby="profile-contact" className={styles.section}>
        <h2 id="profile-contact">Contact</h2>
        <dl className={styles.fields}>
          <div>
            <dt>Email</dt>
            <dd>
              {patient.email ? (
                <a href={`mailto:${patient.email}`}>{patient.email}</a>
              ) : (
                <span className={styles.muted}>Not provided</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              {patient.phone ? (
                <a href={`tel:${patient.phone}`}>{formatPhone(patient.phone)}</a>
              ) : (
                <span className={styles.muted}>Not provided</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="profile-address" className={styles.section}>
        <h2 id="profile-address">Address</h2>
        {address ? (
          <address className={styles.address}>
            <span>{address.line1}</span>
            {address.line2 && <span>{address.line2}</span>}
            <span>
              {[address.city, address.region, address.postal_code].filter(Boolean).join(', ')}
            </span>
            <span>{countryName(address.country ?? 'US')}</span>
          </address>
        ) : (
          <p className={styles.muted}>No address on file.</p>
        )}
      </section>

      <section
        aria-labelledby="profile-medical"
        className={`${styles.section} ${styles.sectionWide}`}
      >
        <h2 id="profile-medical">Medical</h2>
        <dl className={`${styles.fields} ${styles.fieldsTwo}`}>
          <div>
            <dt>Blood type</dt>
            <dd className={styles.value}>{bloodTypeLabel(patient.blood_type)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className={styles.value}>{STATUS_LABELS[patient.status]}</dd>
          </div>
        </dl>
        <div>
          <h3 className={styles.groupLabel}>
            Conditions
            <CountPill count={patient.conditions.length} />
          </h3>
          {patient.conditions.length ? (
            <ul className={styles.chips}>
              {patient.conditions.map((c) => (
                <li key={c.name} className={styles.chip}>
                  {c.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No conditions recorded.</p>
          )}
        </div>
        <div>
          <h3 className={styles.groupLabel}>
            Allergies
            <CountPill count={patient.allergies.length} tone="allergy" />
          </h3>
          {patient.allergies.length ? (
            <ul className={styles.chips}>
              {patient.allergies.map((a) => (
                <li key={a.name} className={`${styles.chip} ${styles.chipAllergy}`}>
                  <TriangleAlert />
                  {a.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No known allergies.</p>
          )}
        </div>
      </section>

      <p className={`${styles.footnote} ${styles.sectionWide}`}>
        Record created {formatDate(patient.created_at)} · Last updated{' '}
        {formatDate(patient.updated_at)}
      </p>
    </div>
  );
}

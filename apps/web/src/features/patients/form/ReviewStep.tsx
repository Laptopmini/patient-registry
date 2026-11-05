import { Link } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { CountPill } from '../../../components/ui/CountPill';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { countryName } from '../../../lib/countries';
import { bloodTypeLabel, formatAge, formatDate } from '../../../lib/format';
import { formatPhone } from '../../../lib/phone';
import detail from '../detail/Detail.module.css';
import type { PatientControl } from './fields';
import styles from './PatientWizard.module.css';

function EditLink({ step, label }: { step: number; label: string }) {
  return (
    <Link
      to="/patients/new"
      search={{ step }}
      aria-label={`Edit ${label}`}
      className={styles.editLink}
    >
      Edit
    </Link>
  );
}

const none = (text: string) => <span className={detail.muted}>{text}</span>;

/** The last step: every section as typed, each with an "Edit" link back to its step. */
export function ReviewStep({ control }: { control: PatientControl }) {
  const values = useWatch({ control });
  const address = values.address;
  const hasAddress = Boolean(address?.line1 || address?.city);
  const allergies = values.allergies ?? [];
  const conditions = values.conditions ?? [];
  const dob = values.date_of_birth;
  const phone = values.phone?.replace(/[\s().-]/g, '');

  return (
    <>
      <h2 className="visually-hidden">Review</h2>
      <p className={styles.reviewIntro}>Check the details below, then create the patient.</p>

      <section aria-labelledby="review-details" className={styles.reviewCard}>
        <div className={styles.reviewHead}>
          <h3 id="review-details">Patient details</h3>
          <EditLink step={1} label="patient details" />
        </div>
        <dl className={`${detail.fields} ${detail.fieldsTwo}`}>
          <div>
            <dt>Name</dt>
            <dd className={detail.value}>
              {values.first_name} {values.last_name}
            </dd>
          </div>
          <div>
            <dt>Date of birth</dt>
            <dd>{dob ? `${formatDate(dob)} (${formatAge(dob)})` : none('Not provided')}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{values.email || none('Not provided')}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{phone ? formatPhone(phone) : none('Not provided')}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="review-address" className={styles.reviewCard}>
        <div className={styles.reviewHead}>
          <h3 id="review-address">Address</h3>
          <EditLink step={2} label="address" />
        </div>
        {hasAddress && address ? (
          <address className={detail.address}>
            <span>{address.line1}</span>
            {address.line2 && <span>{address.line2}</span>}
            <span>
              {[address.city, address.region, address.postal_code].filter(Boolean).join(', ')}
            </span>
            <span>{countryName(address.country ?? 'US')}</span>
          </address>
        ) : (
          none('No address')
        )}
      </section>

      <section aria-labelledby="review-medical" className={styles.reviewCard}>
        <div className={styles.reviewHead}>
          <h3 id="review-medical">Medical</h3>
          <EditLink step={3} label="medical details" />
        </div>
        <dl className={`${detail.fields} ${detail.fieldsTwo}`}>
          <div>
            <dt>Blood type</dt>
            <dd className={detail.value}>{bloodTypeLabel(values.blood_type ?? 'unknown')}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{values.status && <StatusBadge status={values.status} />}</dd>
          </div>
        </dl>
        <div>
          <h4 className={detail.groupLabel}>
            Allergies
            {allergies.length > 0 && <CountPill count={allergies.length} tone="allergy" />}
          </h4>
          {allergies.length ? (
            <ul className={detail.chips}>
              {allergies.map((a) => (
                <li key={a?.name} className={`${detail.chip} ${detail.chipAllergy}`}>
                  <TriangleAlert aria-hidden="true" />
                  {a?.name}
                </li>
              ))}
            </ul>
          ) : (
            none('None recorded')
          )}
        </div>
        <div>
          <h4 className={detail.groupLabel}>
            Conditions
            {conditions.length > 0 && <CountPill count={conditions.length} />}
          </h4>
          {conditions.length ? (
            <ul className={detail.chips}>
              {conditions.map((c) => (
                <li key={c?.name} className={detail.chip}>
                  {c?.name}
                </li>
              ))}
            </ul>
          ) : (
            none('None recorded')
          )}
        </div>
      </section>
    </>
  );
}

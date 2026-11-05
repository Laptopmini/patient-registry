import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import type { PatientOut } from '../../../api/generated/model';
import styles from './Detail.module.css';

const regionNames = new Intl.DisplayNames(undefined, { type: 'region' });

const countryName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

/** International format when the number parses, else the stored E.164 value. */
export const formatPhone = (e164: string) =>
  parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;

export function ProfileTab({ patient }: { patient: PatientOut }) {
  const { address } = patient;
  return (
    <div>
      <section aria-labelledby="profile-contact">
        <h2 id="profile-contact">Contact</h2>
        <dl className={styles.facts}>
          <div>
            <dt>Email</dt>
            <dd>
              {patient.email ? (
                <a href={`mailto:${patient.email}`}>{patient.email}</a>
              ) : (
                'Not provided'
              )}
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              {patient.phone ? (
                <a href={`tel:${patient.phone}`}>{formatPhone(patient.phone)}</a>
              ) : (
                'Not provided'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="profile-address">
        <h2 id="profile-address">Address</h2>
        {address ? (
          <address>
            {address.line1}
            <br />
            {address.line2 && (
              <>
                {address.line2}
                <br />
              </>
            )}
            {[address.city, address.region, address.postal_code].filter(Boolean).join(', ')}
            <br />
            {countryName(address.country ?? 'US')}
          </address>
        ) : (
          <p>No address on file.</p>
        )}
      </section>

      <section aria-labelledby="profile-conditions">
        <h2 id="profile-conditions">Conditions</h2>
        {patient.conditions.length ? (
          <ul className={styles.chips}>
            {patient.conditions.map((c) => (
              <li key={c.name} className={styles.chip}>
                {c.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No conditions recorded.</p>
        )}
      </section>
    </div>
  );
}

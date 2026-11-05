import { CircleCheck, CircleMinus, Clock } from 'lucide-react';
import type { PatientStatus } from '../../api/generated/model';
import { STATUS_LABELS } from '../../lib/format';
import styles from './StatusBadge.module.css';

const ICONS = { active: CircleCheck, follow_up: Clock, inactive: CircleMinus } as const;

const TONE: Record<PatientStatus, string> = {
  active: styles.active,
  follow_up: styles.followUp,
  inactive: styles.inactive,
};

/** Status is an icon plus text, with a tint; it is never colour alone and not interactive. */
export function StatusBadge({ status }: { status: PatientStatus }) {
  const Icon = ICONS[status];
  return (
    <span className={`${styles.badge} ${TONE[status]}`}>
      <Icon className={styles.icon} strokeWidth={2.2} />
      {STATUS_LABELS[status]}
    </span>
  );
}

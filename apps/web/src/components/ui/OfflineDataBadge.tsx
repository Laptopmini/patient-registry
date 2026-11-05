import { Clock } from 'lucide-react';
import { formatTime } from '../../lib/format';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import styles from './OfflineDataBadge.module.css';

/** "Showing data from 13:02", next to the h1 of a read-only screen while offline. */
export function OfflineDataBadge({ updatedAt }: { updatedAt: number }) {
  const online = useOnlineStatus();
  if (online || !updatedAt) return null;
  return (
    <span className={styles.badge}>
      <Clock aria-hidden="true" />
      Showing data from {formatTime(updatedAt)}
    </span>
  );
}

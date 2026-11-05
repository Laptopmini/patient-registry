import type { ReactNode } from 'react';
import styles from './Banner.module.css';

interface BannerProps {
  tone?: 'info' | 'error' | 'warning' | 'success';
  /** `alert` interrupts the user; `status` is announced politely. */
  role?: 'alert' | 'status';
  children: ReactNode;
  action?: ReactNode;
  label?: string;
}

export function Banner({ tone = 'info', role = 'status', children, action, label }: BannerProps) {
  const toneClass = tone === 'info' ? '' : styles[tone];
  return (
    <div className={`${styles.banner} ${toneClass}`} role={role} data-label={label}>
      <p className={styles.message}>{children}</p>
      {action}
    </div>
  );
}

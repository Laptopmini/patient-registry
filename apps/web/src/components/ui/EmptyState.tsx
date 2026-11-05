import { CircleAlert, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  /** The one action: a Button or a link-styled button. */
  action?: ReactNode;
  /** `empty` uses info colours; `error` uses danger colours and `role="alert"`. */
  tone?: 'empty' | 'error';
  /** Heading level, so the block fits the page outline. */
  headingLevel?: 2 | 3;
}

/** A centred block for "nothing here" and "couldn't load": icon, heading, a sentence, one action. */
export function EmptyState({
  title,
  children,
  action,
  tone = 'empty',
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={styles.block} {...(tone === 'error' ? { role: 'alert' } : {})}>
      <span className={`${styles.icon} ${tone === 'error' ? styles.error : styles.info}`}>
        {tone === 'error' ? <CircleAlert /> : <Search />}
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {children && <p className={styles.body}>{children}</p>}
      {action}
    </div>
  );
}

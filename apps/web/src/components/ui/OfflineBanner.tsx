import { Check, WifiOff } from 'lucide-react';
import { Button } from './Button';
import styles from './OfflineBanner.module.css';

interface OfflineBannerProps {
  /** `offline` asks to retry; `online` is the short "Back online" confirmation. */
  state: 'offline' | 'online';
  onRetry: () => void;
  isRetrying?: boolean;
}

/** The bar under the header while the connection is down. A polite live region. */
export function OfflineBanner({ state, onRetry, isRetrying = false }: OfflineBannerProps) {
  return (
    <div role="status" className={styles.banner}>
      {state === 'offline' ? (
        <>
          <WifiOff className={styles.icon} />
          <p className={styles.text}>You appear to be offline. Your changes are kept.</p>
          <Button small isPending={isRetrying} onPress={onRetry}>
            {isRetrying ? 'Retrying…' : 'Retry'}
          </Button>
        </>
      ) : (
        <>
          <Check className={styles.icon} />
          <p className={styles.text}>Back online</p>
        </>
      )}
    </div>
  );
}

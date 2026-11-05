import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { Banner } from '../ui/Banner';

const BACK_ONLINE_MS = 5000;

/** Shown below the header while offline, then briefly as "Back online". */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(!online);

  if (!online && !wasOffline) setWasOffline(true);

  useEffect(() => {
    if (!online || !wasOffline) return;
    const timer = setTimeout(() => setWasOffline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [online, wasOffline]);

  if (online && !wasOffline) return null;

  return online ? (
    <Banner tone="success" label="Connection status">
      Back online. You can retry anything that failed.
    </Banner>
  ) : (
    <Banner tone="warning" label="Connection status">
      You appear to be offline. You can still read what has loaded, but changes can't be saved until
      you're back online.
    </Banner>
  );
}

import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import { OfflineBanner as OfflineBannerView } from '../ui/OfflineBanner';

const BACK_ONLINE_MS = 4000;

/** Under the header while offline, then "Back online" for 4 seconds. Retry refetches what's on screen. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching() > 0;
  const [wasOffline, setWasOffline] = useState(!online);
  const [retrying, setRetrying] = useState(false);

  if (!online && !wasOffline) setWasOffline(true);

  useEffect(() => {
    if (!online || !wasOffline) return;
    const timer = setTimeout(() => setWasOffline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [online, wasOffline]);

  if (online && !wasOffline) return null;

  return (
    <OfflineBannerView
      state={online ? 'online' : 'offline'}
      isRetrying={retrying && isFetching}
      onRetry={() => {
        setRetrying(true);
        void queryClient.refetchQueries({ type: 'active' }).finally(() => setRetrying(false));
      }}
    />
  );
}

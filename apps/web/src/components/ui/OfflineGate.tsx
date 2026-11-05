import type { ReactNode } from 'react';
import { Focusable, Tooltip, TooltipTrigger } from 'react-aria-components';
import { useOnlineStatus } from '../../lib/useOnlineStatus';
import styles from './OfflineGate.module.css';
import tooltipStyles from './Tooltip.module.css';

/** What the child needs to know: whether to render itself disabled. */
export const useOffline = () => !useOnlineStatus();

/**
 * Wraps an action that needs the network. While offline the child should be rendered
 * disabled (use `useOffline`); this adds a focusable wrapper whose tooltip explains why.
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const offline = useOffline();
  if (!offline) return children;
  return (
    <TooltipTrigger>
      <Focusable>
        {/* A disabled button can't take focus, so this wrapper does, to carry the tooltip. */}
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users need the explanation too */}
        <span tabIndex={0} className={styles.gate}>
          {children}
        </span>
      </Focusable>
      <Tooltip className={tooltipStyles.tooltip} placement="top" offset={8}>
        Not available offline
      </Tooltip>
    </TooltipTrigger>
  );
}

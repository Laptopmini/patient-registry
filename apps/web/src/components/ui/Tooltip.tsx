import type { ReactNode } from 'react';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';
import styles from './Tooltip.module.css';

interface TooltipProps {
  /** The focusable trigger. */
  children: ReactNode;
  text: string;
  placement?: 'top' | 'bottom' | 'start' | 'end';
}

/** Supplementary text on hover and focus. Never the only home of required information. */
export function Tooltip({ children, text, placement = 'end' }: TooltipProps) {
  return (
    <TooltipTrigger>
      {children}
      <AriaTooltip className={styles.tooltip} placement={placement} offset={8}>
        {text}
      </AriaTooltip>
    </TooltipTrigger>
  );
}

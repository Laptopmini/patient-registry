import { ProgressBar as AriaProgressBar, Label } from 'react-aria-components';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** Accessible name, for example "Updating results". */
  label: string;
  /** Omit for an indeterminate bar. */
  value?: number;
  maxValue?: number;
  valueText?: string;
  /** Shows the label above the bar; otherwise it is only for screen readers. */
  showLabel?: boolean;
  /** `thin` is the 2px refetch bar; `step` is the 6px wizard bar. */
  size?: 'thin' | 'step';
}

/** A progress bar. The fill moves by `transform`, never by width, so it can't cause layout. */
export function ProgressBar({
  label,
  value,
  maxValue = 100,
  valueText,
  showLabel = false,
  size = 'step',
}: ProgressBarProps) {
  const indeterminate = value === undefined;
  return (
    <AriaProgressBar
      className={`${styles.root} ${size === 'thin' ? styles.thin : styles.step}`}
      {...(indeterminate ? { isIndeterminate: true } : { value })}
      maxValue={maxValue}
      {...(valueText ? { valueText } : {})}
      {...(showLabel ? {} : { 'aria-label': label })}
    >
      {({ percentage }) => (
        <>
          {showLabel && <Label className={styles.label}>{label}</Label>}
          <div className={styles.track}>
            <div
              className={`${styles.fill} ${indeterminate ? styles.indeterminate : ''}`}
              style={indeterminate ? {} : { transform: `scaleX(${(percentage ?? 0) / 100})` }}
            />
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}

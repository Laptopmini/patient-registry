import type { ReactNode } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import styles from './SegmentedControl.module.css';

export interface Segment<K extends string> {
  id: K;
  label: string;
  /** A count shown after the label, for example "Active 13". */
  count?: ReactNode;
}

interface SegmentedControlProps<K extends string> {
  label: string;
  segments: readonly Segment<K>[];
  value: K;
  onChange: (value: K) => void;
}

/** A single-select segmented control (the status filter). One option is always selected. */
export function SegmentedControl<K extends string>({
  label,
  segments,
  value,
  onChange,
}: SegmentedControlProps<K>) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = segments.find((segment) => keys.has(segment.id));
        if (next) onChange(next.id);
      }}
      className={styles.track}
    >
      {segments.map((segment) => (
        <ToggleButton key={segment.id} id={segment.id} className={styles.segment}>
          {segment.label}
          {segment.count !== undefined && <span className={styles.count}>{segment.count}</span>}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

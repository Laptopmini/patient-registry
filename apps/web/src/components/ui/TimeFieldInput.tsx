import type { TimeValue } from 'react-aria-components';
import {
  TimeField as AriaTimeField,
  DateInput,
  DateSegment,
  Label,
  Text,
} from 'react-aria-components';
import styles from './DateField.module.css';
import fieldStyles from './Field.module.css';
import { FieldMessage } from './FieldMessage';

interface TimeFieldInputProps {
  label: string;
  value: TimeValue | null;
  onChange: (value: TimeValue | null) => void;
  onBlur?: () => void;
  error?: string | undefined;
  isInvalid?: boolean;
  description?: string;
  /** 24-hour clock by default, as clinical times are written. */
  hourCycle?: 12 | 24;
}

/** A labelled time-of-day field with hour and minute segments. */
export function TimeFieldInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  isInvalid,
  description,
  hourCycle = 24,
}: TimeFieldInputProps) {
  return (
    <AriaTimeField
      className={styles.picker}
      value={value}
      onChange={onChange}
      hourCycle={hourCycle}
      validationBehavior="aria"
      isInvalid={isInvalid ?? Boolean(error)}
      {...(onBlur ? { onBlur } : {})}
    >
      <Label className={fieldStyles.label}>{label}</Label>
      <DateInput className={`${styles.group} ${styles.input}`}>
        {(segment) => (
          <DateSegment
            segment={segment}
            className={segment.type === 'literal' ? styles.literal : styles.segment}
          />
        )}
      </DateInput>
      {description && (
        <Text slot="description" className={fieldStyles.description}>
          {description}
        </Text>
      )}
      <FieldMessage error={error} />
    </AriaTimeField>
  );
}

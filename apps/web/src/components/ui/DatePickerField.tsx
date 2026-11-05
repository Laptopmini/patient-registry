import type {
  CalendarDate,
  CalendarDateTime,
  DateValue,
  ZonedDateTime,
} from '@internationalized/date';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
  Text,
} from 'react-aria-components';
import styles from './DateField.module.css';
import fieldStyles from './Field.module.css';

interface DatePickerFieldProps {
  label: string;
  value: DateValue | null;
  onChange: (value: CalendarDate | CalendarDateTime | ZonedDateTime | null) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  granularity?: 'day' | 'minute';
  error?: string | undefined;
  description?: string;
}

/** A labelled date (or date and time) picker: segmented input plus a calendar popover. */
export function DatePickerField({
  label,
  value,
  onChange,
  onBlur,
  name,
  id,
  granularity = 'day',
  error,
  description,
}: DatePickerFieldProps) {
  return (
    <DatePicker<DateValue>
      className={styles.picker}
      value={value}
      onChange={onChange}
      granularity={granularity}
      validationBehavior="aria"
      isInvalid={Boolean(error)}
      {...(onBlur ? { onBlur } : {})}
      {...(name ? { name } : {})}
      {...(id ? { id } : {})}
    >
      <Label className={fieldStyles.label}>{label}</Label>
      <Group className={styles.group}>
        <DateInput className={styles.input}>
          {(segment) => <DateSegment segment={segment} className={styles.segment} />}
        </DateInput>
        <Button className={styles.trigger} aria-label={`Open calendar for ${label}`}>
          <span aria-hidden="true">▾</span>
        </Button>
      </Group>
      {description && (
        <Text slot="description" className={fieldStyles.description}>
          {description}
        </Text>
      )}
      <FieldError className={fieldStyles.error}>{error}</FieldError>
      <Popover className={styles.popover}>
        <Dialog>
          <Calendar>
            <div className={styles.calendarHeader}>
              <Button slot="previous" className={styles.calendarNav} aria-label="Previous month">
                <span aria-hidden="true">◀</span>
              </Button>
              <Heading />
              <Button slot="next" className={styles.calendarNav} aria-label="Next month">
                <span aria-hidden="true">▶</span>
              </Button>
            </div>
            <CalendarGrid className={styles.grid}>
              {(date) => <CalendarCell date={date} className={styles.cell} />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}

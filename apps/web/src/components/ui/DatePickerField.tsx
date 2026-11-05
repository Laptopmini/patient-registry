import type {
  CalendarDate,
  CalendarDateTime,
  DateValue,
  ZonedDateTime,
} from '@internationalized/date';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
  Text,
} from 'react-aria-components';
import { monthShort } from '../../lib/format';
import styles from './DateField.module.css';
import fieldStyles from './Field.module.css';
import { FieldMessage } from './FieldMessage';

interface DatePickerFieldProps {
  label: string;
  value: DateValue | null;
  onChange: (value: CalendarDate | CalendarDateTime | ZonedDateTime | null) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  granularity?: 'day' | 'minute';
  error?: string | undefined;
  /** Marks the field invalid when its message is shown elsewhere. */
  isInvalid?: boolean;
  description?: string;
  minValue?: DateValue;
  maxValue?: DateValue;
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
  isInvalid,
  description,
  minValue,
  maxValue,
}: DatePickerFieldProps) {
  return (
    <DatePicker<DateValue>
      className={styles.picker}
      value={value}
      onChange={onChange}
      granularity={granularity}
      validationBehavior="aria"
      {...(minValue ? { minValue } : {})}
      {...(maxValue ? { maxValue } : {})}
      isInvalid={isInvalid ?? Boolean(error)}
      {...(onBlur ? { onBlur } : {})}
      {...(name ? { name } : {})}
      {...(id ? { id } : {})}
    >
      <Label className={fieldStyles.label}>{label}</Label>
      <Group className={styles.group}>
        <DateInput className={styles.input}>
          {(segment) => (
            <DateSegment segment={segment} className={styles.segment}>
              {segment.type === 'month'
                ? segment.isPlaceholder || segment.value == null
                  ? 'mmm'
                  : monthShort(segment.value)
                : segment.type === 'literal'
                  ? value
                    ? ' '
                    : ' / '
                  : segment.type === 'day' && !segment.isPlaceholder
                    ? // "5 Nov 2026", not "05": no leading zero once the day is set.
                      segment.text.replace(/^0(\d)$/, '$1')
                    : segment.text}
            </DateSegment>
          )}
        </DateInput>
        <Button className={styles.trigger} aria-label={`Open calendar for ${label}`}>
          <CalendarIcon />
        </Button>
      </Group>
      {description && (
        <Text slot="description" className={fieldStyles.description}>
          {description}
        </Text>
      )}
      <FieldMessage error={error} />
      <Popover className={styles.popover}>
        <Dialog>
          <Calendar>
            <div className={styles.calendarHeader}>
              <Button slot="previous" className={styles.calendarNav} aria-label="Previous month">
                <ChevronLeft />
              </Button>
              <Heading />
              <Button slot="next" className={styles.calendarNav} aria-label="Next month">
                <ChevronRight />
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

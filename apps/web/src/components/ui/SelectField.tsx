import { Check, ChevronDown } from 'lucide-react';
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components';
import fieldStyles from './Field.module.css';
import { FieldMessage } from './FieldMessage';
import popoverStyles from './ListPopover.module.css';
import styles from './SelectField.module.css';

export interface SelectOption<K extends string> {
  id: K;
  label: string;
}

interface SelectFieldProps<K extends string> {
  label: string;
  options: readonly SelectOption<K>[];
  value: K;
  onChange: (value: K) => void;
  onBlur?: () => void;
  name?: string;
  error?: string | undefined;
  isDisabled?: boolean;
}

/** A labelled single-select built on React Aria's Select. */
export function SelectField<K extends string>({
  label,
  options,
  value,
  onChange,
  onBlur,
  name,
  error,
  isDisabled,
}: SelectFieldProps<K>) {
  return (
    <Select
      className={fieldStyles.field}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(key as K);
      }}
      {...(onBlur ? { onBlur } : {})}
      {...(name ? { name } : {})}
      {...(isDisabled ? { isDisabled } : {})}
      validationBehavior="aria"
      isInvalid={Boolean(error)}
    >
      <Label className={fieldStyles.label}>{label}</Label>
      <Button className={styles.trigger}>
        <SelectValue />
        <ChevronDown />
      </Button>
      <FieldMessage error={error} />
      <Popover className={popoverStyles.popover}>
        <ListBox className={popoverStyles.listbox} items={options}>
          {(option) => (
            <ListBoxItem className={popoverStyles.option} textValue={option.label}>
              {({ isSelected }) => (
                <>
                  {option.label}
                  {isSelected && <Check className={popoverStyles.check} />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

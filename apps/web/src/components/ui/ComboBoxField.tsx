import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ComboBox,
  Input,
  type Key,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components';
import styles from './ComboBoxField.module.css';
import popoverStyles from './ListPopover.module.css';

interface ComboBoxFieldProps<T extends { id: string }> {
  label: string;
  placeholder?: string;
  items: readonly T[];
  inputValue: string;
  onInputChange: (value: string) => void;
  /** Called with the chosen item's id; the field clears itself afterwards. */
  onSelect: (id: string) => void;
  textValue: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Shown in the list when nothing matches. */
  emptyText: string;
  /** The 52px field used on the dashboard. */
  large?: boolean;
  /** Hide the label visually (it stays for screen readers), as in the header. */
  hideLabel?: boolean;
  autoFocus?: boolean;
}

/**
 * A "find as you type" combobox. Options come from the server, so React Aria's own
 * client-side filter is switched off. Choosing an option calls `onSelect` (Enter opens it).
 */
export function ComboBoxField<T extends { id: string }>({
  label,
  placeholder = 'Name, email or phone',
  items,
  inputValue,
  onInputChange,
  onSelect,
  textValue,
  renderItem,
  emptyText,
  large = false,
  hideLabel = false,
  autoFocus = false,
}: ComboBoxFieldProps<T>) {
  return (
    <ComboBox
      {...(hideLabel ? { 'aria-label': label } : {})}
      className={`${styles.field} ${large ? styles.large : ''}`}
      items={items}
      inputValue={inputValue}
      onInputChange={onInputChange}
      selectedKey={null}
      onSelectionChange={(key: Key | null) => {
        if (key === null) return;
        onSelect(String(key));
        onInputChange('');
      }}
      defaultFilter={() => true}
      menuTrigger="input"
      autoFocus={autoFocus}
    >
      {!hideLabel && <Label className={styles.label}>{label}</Label>}
      <div className={styles.box}>
        <Search className={styles.icon} />
        <Input className={styles.input} placeholder={placeholder} />
      </div>
      <Popover className={popoverStyles.popover}>
        <ListBox
          className={popoverStyles.listbox}
          renderEmptyState={() => <div className={popoverStyles.empty}>{emptyText}</div>}
        >
          {items.map((item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              textValue={textValue(item)}
              className={popoverStyles.option}
            >
              {renderItem(item)}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

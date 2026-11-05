import { Search, X } from 'lucide-react';
import {
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
  Button,
  Input,
  Label,
} from 'react-aria-components';
import styles from './SearchField.module.css';

interface SearchFieldProps extends Omit<AriaSearchFieldProps, 'className' | 'children'> {
  label: string;
  placeholder?: string;
  /** The taller field used on the dashboard. */
  large?: boolean;
}

/** A labelled search input with a search icon and a clear button once there is text. */
export function SearchField({
  label,
  placeholder = 'Name, email or phone',
  large = false,
  ...props
}: SearchFieldProps) {
  return (
    <AriaSearchField {...props} className={`${styles.field} ${large ? styles.large : ''}`}>
      <Label className={styles.label}>{label}</Label>
      <div className={styles.box}>
        <Search className={styles.icon} />
        <Input className={styles.input} placeholder={placeholder} autoComplete="off" />
        <Button className={styles.clear}>
          <X />
        </Button>
      </div>
    </AriaSearchField>
  );
}

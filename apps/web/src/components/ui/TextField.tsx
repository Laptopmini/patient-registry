import type { ReactNode } from 'react';
import {
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  Input,
  Label,
  Text,
  TextArea,
} from 'react-aria-components';
import styles from './Field.module.css';
import { FieldMessage } from './FieldMessage';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children'> {
  label: string;
  description?: ReactNode;
  /** The error message to show. Also sets `aria-invalid`. */
  error?: string | undefined;
  /** Renders a multi-line field. */
  multiline?: boolean;
  /** Text shown under the field, aligned right (for example a character counter). */
  footer?: ReactNode;
  /** `danger` colours the footer, for a counter that is nearly at its limit. */
  footerTone?: 'muted' | 'danger';
  optional?: boolean;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'search' | 'numeric';
}

/**
 * A labelled text field. Description and error are wired up with `aria-describedby`
 * by React Aria; the error is only validated by us (validationBehavior="aria").
 */
export function TextField({
  label,
  description,
  error,
  multiline = false,
  footer,
  footerTone = 'muted',
  optional = false,
  inputRef,
  placeholder,
  autoComplete,
  inputMode,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      validationBehavior="aria"
      isInvalid={props.isInvalid ?? Boolean(error)}
      className={styles.field}
    >
      <Label className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </Label>
      {multiline ? (
        <TextArea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          className={styles.input}
          {...(placeholder ? { placeholder } : {})}
        />
      ) : (
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          className={styles.input}
          {...(placeholder ? { placeholder } : {})}
          {...(autoComplete ? { autoComplete } : {})}
          {...(inputMode ? { inputMode } : {})}
        />
      )}
      {description && (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      )}
      <FieldMessage error={error} />
      {footer && (
        <div
          aria-live="polite"
          className={`${styles.counter} ${footerTone === 'danger' ? styles.counterDanger : ''}`}
        >
          {footer}
        </div>
      )}
    </AriaTextField>
  );
}

import type { ReactNode } from 'react';
import {
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  FieldError,
  Input,
  Label,
  Text,
  TextArea,
} from 'react-aria-components';
import styles from './Field.module.css';

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children'> {
  label: string;
  description?: ReactNode;
  /** The error message to show. Also sets `aria-invalid`. */
  error?: string | undefined;
  /** Renders a multi-line field. */
  multiline?: boolean;
  /** Text shown under the field, aligned right (for example a character counter). */
  footer?: ReactNode;
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
      <FieldError className={styles.error}>{error}</FieldError>
      {footer && <div className={styles.counter}>{footer}</div>}
    </AriaTextField>
  );
}

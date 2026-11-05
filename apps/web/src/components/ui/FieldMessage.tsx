import { CircleAlert } from 'lucide-react';
import { FieldError } from 'react-aria-components';
import styles from './Field.module.css';

/** The error line under a field: an icon and text, never colour alone. */
export function FieldMessage({ error }: { error: string | undefined }) {
  return (
    <FieldError className={styles.error}>
      {error ? (
        <>
          <CircleAlert />
          {error}
        </>
      ) : undefined}
    </FieldError>
  );
}

/** The same message outside a React Aria field, for errors that belong to a group of controls. */
export function InlineError({ children, id }: { children: string; id?: string }) {
  return (
    <p {...(id ? { id } : {})} role="alert" className={styles.error}>
      <CircleAlert />
      {children}
    </p>
  );
}

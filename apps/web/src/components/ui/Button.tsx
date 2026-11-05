import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import styles from './Button.module.css';

export type ButtonVariant = 'secondary' | 'primary' | 'danger' | 'dangerSolid' | 'quiet' | 'link';

/** Class names for anything that should look like a button (including router links). */
export const buttonClass = (variant: ButtonVariant = 'secondary') =>
  variant === 'secondary' ? styles.button : `${styles.button} ${styles[variant]}`;

interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children'> {
  variant?: ButtonVariant;
  children?: ReactNode;
  /** The 36px variant, for use inside a 44px row only. */
  small?: boolean;
  /** Icon-only quiet buttons that turn red on hover (delete). */
  danger?: boolean;
}

/**
 * The one button. While `isPending` the width is kept, the spinner shows (unless the user
 * prefers reduced motion) and React Aria marks it `aria-disabled`; pass the pending label
 * ("Saving…") as the children.
 */
export function Button({
  variant = 'secondary',
  small = false,
  danger = false,
  children,
  ...props
}: ButtonProps) {
  const className = `${buttonClass(variant)}${small ? ` ${styles.small}` : ''}`;
  return (
    <AriaButton {...props} className={className} {...(danger ? { 'data-danger': true } : {})}>
      {({ isPending }) => (
        <>
          {isPending && <LoaderCircle className={styles.spinner} />}
          {children}
        </>
      )}
    </AriaButton>
  );
}

import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import styles from './Button.module.css';

export type ButtonVariant = 'secondary' | 'primary' | 'danger' | 'quiet';

/** Class names for anything that should look like a button (including router links). */
export const buttonClass = (variant: ButtonVariant = 'secondary') =>
  variant === 'secondary' ? styles.button : `${styles.button} ${styles[variant]}`;

interface ButtonProps extends Omit<AriaButtonProps, 'className'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', ...props }: ButtonProps) {
  return <AriaButton {...props} className={buttonClass(variant)} />;
}

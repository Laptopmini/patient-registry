import type { ReactNode } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';
import fieldStyles from './Field.module.css';
import { FieldMessage } from './FieldMessage';
import styles from './RadioCards.module.css';

export interface RadioCardOption<K extends string> {
  id: K;
  label: string;
  icon?: ReactNode;
}

interface RadioCardsProps<K extends string> {
  label: string;
  options: readonly RadioCardOption<K>[];
  value: K;
  onChange: (value: K) => void;
  error?: string | undefined;
}

/** A radio group drawn as cards (the status picker). One column on compact. */
export function RadioCards<K extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: RadioCardsProps<K>) {
  return (
    <RadioGroup
      value={value}
      onChange={(next) => onChange(next as K)}
      validationBehavior="aria"
      isInvalid={Boolean(error)}
      className={fieldStyles.field}
    >
      <Label className={fieldStyles.label}>{label}</Label>
      <div className={styles.grid}>
        {options.map((option) => (
          <Radio key={option.id} value={option.id} className={styles.card}>
            <span className={styles.ring} />
            {option.icon}
            <span className={styles.text}>{option.label}</span>
          </Radio>
        ))}
      </div>
      <FieldMessage error={error} />
    </RadioGroup>
  );
}

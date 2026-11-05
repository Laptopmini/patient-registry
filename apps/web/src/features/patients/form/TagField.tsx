import { useState } from 'react';
import { Button, Label, Tag, TagGroup, TagList, Text } from 'react-aria-components';
import { useController } from 'react-hook-form';
import fieldStyles from '../../../components/ui/Field.module.css';
import { TextField } from '../../../components/ui/TextField';
import type { PatientControl } from './PatientForm';
import styles from './PatientForm.module.css';
import { flattenErrors } from './patientFormSchema';

const MAX_LENGTH = 100;

interface TagFieldProps {
  control: PatientControl;
  name: 'allergies' | 'conditions';
  label: string;
  /** Singular noun for the add field and messages, for example "allergy". */
  noun: string;
}

/** A list of removable tags with a text field that adds on Enter. Duplicates are rejected. */
export function TagField({ control, name, label, noun }: TagFieldProps) {
  const { field, fieldState } = useController({ control, name });
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();

  const items = field.value.map((item) => ({ id: item.name.toLowerCase(), name: item.name }));
  const formError = flattenErrors(fieldState.error)[0]?.message;
  const labelId = `${name}-label`;

  const add = () => {
    const value = draft.trim();
    if (value === '') return;
    if (value.length > MAX_LENGTH) {
      setLocalError(`Use at most ${MAX_LENGTH} characters.`);
      return;
    }
    if (items.some((item) => item.id === value.toLowerCase())) {
      setLocalError(`"${value}" is already in the list.`);
      return;
    }
    field.onChange([...field.value, { name: value }]);
    setDraft('');
    setLocalError(undefined);
  };

  return (
    <div data-field={name} className={styles.tags}>
      <TagGroup
        aria-labelledby={labelId}
        onRemove={(keys) =>
          field.onChange(field.value.filter((i) => !keys.has(i.name.toLowerCase())))
        }
      >
        <Label id={labelId} className={fieldStyles.label}>
          {label}
        </Label>
        <TagList
          items={items}
          className={styles.tagList}
          renderEmptyState={() => <span className={styles.tagEmpty}>None added</span>}
        >
          {(item) => (
            <Tag id={item.id} textValue={item.name} className={styles.tag}>
              {item.name}
              <Button slot="remove" className={styles.tagRemove} aria-label={`Remove ${item.name}`}>
                <span aria-hidden="true">×</span>
              </Button>
            </Tag>
          )}
        </TagList>
        <Text slot="description" className={fieldStyles.description}>
          {items.length} added
        </Text>
      </TagGroup>
      <TextField
        label={`Add ${noun}`}
        description="Type a name, then press Enter to add it"
        value={draft}
        onChange={(value) => {
          setDraft(value);
          setLocalError(undefined);
        }}
        onBlur={field.onBlur}
        inputRef={field.ref}
        error={localError ?? formError}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            // Enter adds the tag; it must never submit the surrounding form.
            event.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}

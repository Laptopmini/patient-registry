import { TriangleAlert, X } from 'lucide-react';
import { type Ref, useState } from 'react';
import { Label, Tag, TagGroup, TagList, Text } from 'react-aria-components';
import { Button } from './Button';
import fieldStyles from './Field.module.css';
import styles from './TagInput.module.css';
import { TextField } from './TextField';

export const TAG_MAX_LENGTH = 100;
export const TAG_MAX_ITEMS = 50;

interface TagInputProps {
  label: string;
  /** Singular noun for the add field and messages, for example "allergy". */
  noun: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** Allergy tags are red with an icon; condition tags are neutral. */
  tone: 'allergy' | 'condition';
  /** An error from the surrounding form, shown under the add field. */
  error?: string | undefined;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  /** Lets an error summary find the field. */
  fieldName?: string;
}

/**
 * A list of removable tags plus a text field and an "Add" button. Enter or Add adds the
 * trimmed value and clears the field with focus staying in it. Duplicates (case-insensitive)
 * are rejected. Removing a tag moves focus to the next tag, or the field if none are left.
 */
export function TagInput({
  label,
  noun,
  values,
  onChange,
  tone,
  error,
  onBlur,
  inputRef,
  fieldName,
}: TagInputProps) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();
  const labelId = `${fieldName ?? noun}-tags-label`;
  const items = values.map((name) => ({ id: name.toLowerCase(), name }));

  const add = () => {
    const value = draft.trim();
    if (value === '') return;
    if (value.length > TAG_MAX_LENGTH) {
      setLocalError(`Use at most ${TAG_MAX_LENGTH} characters.`);
      return;
    }
    if (values.length >= TAG_MAX_ITEMS) {
      setLocalError(`You can add at most ${TAG_MAX_ITEMS} items.`);
      return;
    }
    if (items.some((item) => item.id === value.toLowerCase())) {
      setLocalError(`${value} is already in the list`);
      return;
    }
    onChange([...values, value]);
    setDraft('');
    setLocalError(undefined);
  };

  return (
    <div {...(fieldName ? { 'data-field': fieldName } : {})} className={styles.root}>
      <TagGroup
        aria-labelledby={labelId}
        onRemove={(keys) => onChange(values.filter((name) => !keys.has(name.toLowerCase())))}
      >
        <Label id={labelId} className={fieldStyles.label}>
          {label}
        </Label>
        <TagList
          items={items}
          className={styles.list}
          renderEmptyState={() => <span className={styles.empty}>None added</span>}
        >
          {(item) => (
            <Tag
              id={item.id}
              textValue={item.name}
              className={`${styles.tag} ${tone === 'allergy' ? styles.allergy : styles.condition}`}
            >
              {tone === 'allergy' && <TriangleAlert className={styles.tagIcon} />}
              {item.name}
              <Button slot="remove" variant="quiet" aria-label={`Remove ${item.name}`}>
                <X />
              </Button>
            </Tag>
          )}
        </TagList>
        <Text slot="description" className={fieldStyles.description}>
          {items.length} added
        </Text>
      </TagGroup>
      <div className={styles.addRow}>
        <div className={styles.addField}>
          <TextField
            label={`Add ${noun}`}
            description="Type a name, then press Enter to add it"
            value={draft}
            onChange={(value) => {
              setDraft(value);
              setLocalError(undefined);
            }}
            onBlur={() => onBlur?.()}
            {...(inputRef ? { inputRef } : {})}
            error={localError ?? error}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                // Enter adds the tag; it must never submit the surrounding form.
                event.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button onPress={add}>Add</Button>
      </div>
    </div>
  );
}

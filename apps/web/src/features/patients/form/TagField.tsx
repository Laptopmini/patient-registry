import { useController } from 'react-hook-form';
import { TagInput } from '../../../components/ui/TagInput';
import type { PatientControl } from './fields';
import { flattenErrors } from './patientFormSchema';

interface TagFieldProps {
  control: PatientControl;
  name: 'allergies' | 'conditions';
  label: string;
  /** Singular noun for the add field and messages, for example "allergy". */
  noun: string;
}

/** Binds the tag input to the patient form's allergies or conditions list. */
export function TagField({ control, name, label, noun }: TagFieldProps) {
  const { field, fieldState } = useController({ control, name });
  return (
    <TagInput
      label={label}
      noun={noun}
      fieldName={name}
      optional
      tone={name === 'allergies' ? 'allergy' : 'condition'}
      values={field.value.map((item) => item.name)}
      onChange={(names) => field.onChange(names.map((value) => ({ name: value })))}
      onBlur={field.onBlur}
      inputRef={field.ref}
      error={flattenErrors(fieldState.error)[0]?.message}
    />
  );
}

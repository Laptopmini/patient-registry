import { parseDate } from '@internationalized/date';
import { CircleCheck, CircleMinus, Clock } from 'lucide-react';
import { type Control, Controller, type FieldPath } from 'react-hook-form';
import type { BloodType, PatientStatus } from '../../../api/generated/model';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import fieldStyles from '../../../components/ui/Field.module.css';
import { RadioCards } from '../../../components/ui/RadioCards';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { TextField, type TextFieldProps } from '../../../components/ui/TextField';
import { countryOptions } from '../../../lib/countries';
import {
  earliestDob,
  type PatientFormOutput,
  type PatientFormValues,
  todayLocal,
} from './patientFormSchema';
import { TagField } from './TagField';

export type PatientControl = Control<PatientFormValues, unknown, PatientFormOutput>;

export const fieldId = (name: string) => `field-${name}`;

const BLOOD_TYPES: SelectOption<BloodType>[] = [
  ...(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((id) => ({
    id,
    label: id.replace('-', '−'),
  })),
  { id: 'unknown', label: 'Unknown' },
];

const statusIcon = (Icon: typeof CircleCheck, color: string) => (
  <Icon aria-hidden="true" style={{ color: `var(${color})` }} />
);

const STATUSES = [
  {
    id: 'active',
    label: 'Active',
    icon: statusIcon(CircleCheck, '--color-status-active-icon'),
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    icon: statusIcon(Clock, '--color-status-followup-icon'),
  },
  {
    id: 'inactive',
    label: 'Inactive',
    icon: statusIcon(CircleMinus, '--color-status-inactive-icon'),
  },
] as const satisfies readonly { id: PatientStatus; label: string; icon: React.ReactNode }[];

type TextFieldName = Exclude<
  FieldPath<PatientFormValues>,
  | 'allergies'
  | 'conditions'
  | 'blood_type'
  | 'status'
  | 'date_of_birth'
  | 'address.country'
  | `${string}.${number}.${string}`
>;

interface FormTextProps
  extends Pick<TextFieldProps, 'description' | 'autoComplete' | 'inputMode' | 'optional' | 'type'> {
  control: PatientControl;
  name: TextFieldName;
  label: string;
}

/** A text input registered with react-hook-form, with its error wired to the field. */
function FormText({ control, name, label, ...rest }: FormTextProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div id={fieldId(name)} data-field={name}>
          <TextField
            {...rest}
            label={label}
            value={field.value as string}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={field.ref}
            error={fieldState.error?.message}
          />
        </div>
      )}
    />
  );
}

export function PersonalFields({ control }: { control: PatientControl }) {
  return (
    <>
      <div className={fieldStyles.row}>
        <FormText
          control={control}
          name="first_name"
          label="First name"
          autoComplete="given-name"
        />
        <FormText control={control} name="last_name" label="Last name" autoComplete="family-name" />
      </div>
      <div className={fieldStyles.row}>
        <Controller
          control={control}
          name="date_of_birth"
          render={({ field, fieldState }) => (
            <div id={fieldId('date_of_birth')} data-field="date_of_birth">
              <DatePickerField
                label="Date of birth"
                value={field.value ? parseDate(field.value) : null}
                onChange={(value) => field.onChange(value ? value.toString() : '')}
                onBlur={field.onBlur}
                name={field.name}
                minValue={parseDate(earliestDob())}
                maxValue={parseDate(todayLocal())}
                error={fieldState.error?.message}
              />
            </div>
          )}
        />
      </div>
      <div className={fieldStyles.row}>
        <FormText
          control={control}
          name="email"
          label="Email"
          optional
          inputMode="email"
          autoComplete="email"
        />
        <FormText
          control={control}
          name="phone"
          label="Phone"
          optional
          inputMode="tel"
          autoComplete="tel"
          description="International format, e.g. +1 212 555 0100"
        />
      </div>
    </>
  );
}

export function AddressFields({ control }: { control: PatientControl }) {
  return (
    <>
      <FormText
        control={control}
        name="address.line1"
        label="Address line 1"
        autoComplete="address-line1"
      />
      <FormText
        control={control}
        name="address.line2"
        label="Address line 2"
        optional
        autoComplete="address-line2"
      />
      <div className={fieldStyles.row3}>
        <FormText
          control={control}
          name="address.city"
          label="City"
          autoComplete="address-level2"
        />
        <FormText
          control={control}
          name="address.region"
          label="Region"
          optional
          autoComplete="address-level1"
        />
        <FormText
          control={control}
          name="address.postal_code"
          label="Postal code"
          optional
          autoComplete="postal-code"
        />
      </div>
      <div className={fieldStyles.row}>
        <Controller
          control={control}
          name="address.country"
          render={({ field, fieldState }) => (
            <div id={fieldId('address.country')} data-field="address.country">
              <SelectField
                label="Country"
                options={countryOptions(field.value)}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
              />
            </div>
          )}
        />
      </div>
    </>
  );
}

export function MedicalFields({ control }: { control: PatientControl }) {
  return (
    <>
      <div className={fieldStyles.row}>
        <Controller
          control={control}
          name="blood_type"
          render={({ field, fieldState }) => (
            <div id={fieldId('blood_type')} data-field="blood_type">
              <SelectField
                label="Blood type"
                options={BLOOD_TYPES}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
              />
            </div>
          )}
        />
      </div>
      <Controller
        control={control}
        name="status"
        render={({ field, fieldState }) => (
          <div id={fieldId('status')} data-field="status">
            <RadioCards
              label="Status"
              options={STATUSES}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          </div>
        )}
      />
      <div id={fieldId('allergies')}>
        <TagField control={control} name="allergies" label="Allergies" noun="allergy" />
      </div>
      <div id={fieldId('conditions')}>
        <TagField control={control} name="conditions" label="Conditions" noun="condition" />
      </div>
    </>
  );
}

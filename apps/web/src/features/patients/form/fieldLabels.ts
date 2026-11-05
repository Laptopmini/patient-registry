export interface FlatErrorItem {
  name: string;
  message: string;
}

const LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  date_of_birth: 'Date of birth',
  email: 'Email',
  phone: 'Phone',
  'address.line1': 'Address line 1',
  'address.line2': 'Address line 2',
  'address.city': 'City',
  'address.region': 'Region',
  'address.postal_code': 'Postal code',
  'address.country': 'Country',
  blood_type: 'Blood type',
  status: 'Status',
  allergies: 'Allergies',
  conditions: 'Conditions',
};

/** A human label for a dotted field path; list items (`allergies.1.name`) use their list's label. */
export function fieldLabel(name: string): string {
  const exact = LABELS[name];
  if (exact) return exact;
  const root = name.split('.')[0] ?? name;
  return LABELS[root] ?? name;
}

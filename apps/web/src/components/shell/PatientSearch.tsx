import { keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useListPatients } from '../../api/generated/client';
import { unwrap } from '../../api/unwrap';
import { formatAge, formatDate, listName } from '../../lib/format';
import { ComboBoxField } from '../ui/ComboBoxField';
import listStyles from '../ui/ListPopover.module.css';
import { StatusBadge } from '../ui/StatusBadge';

const DEBOUNCE_MS = 250;
const MAX_OPTIONS = 8;

/** The "Find a patient" combobox shared by the header and the dashboard. */
export function PatientSearch({
  large = false,
  hideLabel = false,
  autoFocus = false,
}: {
  large?: boolean;
  hideLabel?: boolean;
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const { data } = useListPatients(
    { q: query, limit: MAX_OPTIONS },
    { query: { enabled: query !== '', placeholderData: keepPreviousData, select: unwrap } },
  );
  const items = query === '' ? [] : (data?.items ?? []);

  return (
    <ComboBoxField
      label="Find a patient"
      hideLabel={hideLabel}
      large={large}
      autoFocus={autoFocus}
      {...(hideLabel ? { placeholder: 'Find a patient' } : {})}
      items={items}
      inputValue={input}
      onInputChange={setInput}
      textValue={listName}
      emptyText={`No patients match '${query}'`}
      onSelect={(id) => void navigate({ to: '/patients/$patientId', params: { patientId: id } })}
      renderItem={(patient) => (
        <>
          <span className={listStyles.optionText}>
            <span className={listStyles.optionTitle}>{listName(patient)}</span>
            <span className={listStyles.optionMeta}>
              {formatAge(patient.date_of_birth)} · {formatDate(patient.date_of_birth)}
            </span>
          </span>
          <span className={listStyles.check}>
            <StatusBadge status={patient.status} />
          </span>
        </>
      )}
    />
  );
}

import { lazy, Suspense } from 'react';
import styles from './PatientSearchBoundary.module.css';

// The combobox pulls in the listbox and popover code, which the first paint doesn't need.
const PatientSearch = lazy(() =>
  import('./PatientSearch').then((module) => ({ default: module.PatientSearch })),
);

type PatientSearchProps = Parameters<typeof PatientSearch>[0];

/** Loads the search on demand, holding its 44px of space so nothing shifts when it arrives. */
export function PatientSearchBoundary(props: PatientSearchProps) {
  return (
    <Suspense fallback={<div className={styles.placeholder} aria-hidden="true" />}>
      <PatientSearch {...props} />
    </Suspense>
  );
}

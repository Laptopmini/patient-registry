import { Link } from '@tanstack/react-router';
import {
  Cell,
  Column,
  Row,
  type SortDescriptor,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components';
import type { PatientListItem, SortField } from '../../../api/generated/model';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatAge, formatLastVisit, listName } from '../../../lib/format';
import styles from './PatientList.module.css';

const SORTABLE = ['last_name', 'age', 'last_visit'] as const;
type SortColumn = (typeof SORTABLE)[number];

const isSortColumn = (value: string): value is SortColumn =>
  (SORTABLE as readonly string[]).includes(value);

export function toDescriptor(sort: SortField): SortDescriptor | undefined {
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  if (!isSortColumn(column)) return undefined;
  return { column, direction: descending ? 'descending' : 'ascending' };
}

export function fromDescriptor(descriptor: SortDescriptor): SortField | undefined {
  const column = String(descriptor.column);
  if (!isSortColumn(column)) return undefined;
  return (descriptor.direction === 'descending' ? `-${column}` : column) as SortField;
}

interface PatientTableProps {
  items: PatientListItem[];
  sort: SortField;
  onSortChange: (sort: SortField) => void;
}

export function PatientTable({ items, sort, onSortChange }: PatientTableProps) {
  const descriptor = toDescriptor(sort);
  return (
    <Table
      aria-label="Patients"
      className={styles.table}
      {...(descriptor ? { sortDescriptor: descriptor } : {})}
      onSortChange={(next) => {
        const field = fromDescriptor(next);
        if (field) onSortChange(field);
      }}
    >
      <TableHeader>
        <Column id="last_name" isRowHeader allowsSorting className={styles.column}>
          {({ sortDirection }) => (
            <>
              Name
              <SortIndicator direction={sortDirection} />
            </>
          )}
        </Column>
        <Column id="age" allowsSorting className={styles.column}>
          {({ sortDirection }) => (
            <>
              Age
              <SortIndicator direction={sortDirection} />
            </>
          )}
        </Column>
        <Column id="last_visit" allowsSorting className={styles.column}>
          {({ sortDirection }) => (
            <>
              Last visit
              <SortIndicator direction={sortDirection} />
            </>
          )}
        </Column>
        <Column id="status">Status</Column>
        <Column id="actions">
          <span className="visually-hidden">Actions</span>
        </Column>
      </TableHeader>
      <TableBody items={items}>
        {(patient) => (
          <Row id={patient.id} textValue={listName(patient)}>
            <Cell>
              <Link
                to="/patients/$patientId"
                params={{ patientId: patient.id }}
                className={styles.link}
              >
                {listName(patient)}
              </Link>
            </Cell>
            <Cell>{formatAge(patient.date_of_birth)}</Cell>
            <Cell>{formatLastVisit(patient.last_visit)}</Cell>
            <Cell>
              <StatusBadge status={patient.status} />
            </Cell>
            <Cell>
              <Link
                to="/patients/$patientId/edit"
                params={{ patientId: patient.id }}
                className={styles.link}
                aria-label={`Edit ${listName(patient)}`}
              >
                Edit
              </Link>
            </Cell>
          </Row>
        )}
      </TableBody>
    </Table>
  );
}

function SortIndicator({ direction }: { direction: 'ascending' | 'descending' | undefined }) {
  if (!direction) return <span aria-hidden="true">↕</span>;
  return <span aria-hidden="true">{direction === 'ascending' ? '▲' : '▼'}</span>;
}

import { Archive, ArrowDown, ArrowUp, ArrowUpDown, Pencil, User } from 'lucide-react';
import {
  Cell,
  Column,
  Link,
  Row,
  type SortDescriptor,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components';
import type { PatientListItem, SortField } from '../../../api/generated/model';
import { ActionMenu } from '../../../components/ui/ActionMenu';
import { useOffline } from '../../../components/ui/OfflineGate';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatAge, formatDate, listName } from '../../../lib/format';
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
  onOpen: (patientId: string) => void;
  onArchive: (patient: PatientListItem) => void;
}

/** The sort arrow: up or down on the sorted column, a muted up-down on the others. */
function SortIcon({ direction }: { direction: 'ascending' | 'descending' | undefined }) {
  if (!direction) return <ArrowUpDown className={styles.sortIdle} />;
  return direction === 'ascending' ? <ArrowUp /> : <ArrowDown />;
}

export function PatientTable({ items, sort, onSortChange, onOpen, onArchive }: PatientTableProps) {
  const offline = useOffline();
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
            <span className={styles.columnInner}>
              Name
              <SortIcon direction={sortDirection} />
            </span>
          )}
        </Column>
        <Column id="age" allowsSorting className={styles.column}>
          {({ sortDirection }) => (
            <span className={styles.columnInner}>
              Age
              <SortIcon direction={sortDirection} />
            </span>
          )}
        </Column>
        <Column id="last_visit" allowsSorting className={styles.column}>
          {({ sortDirection }) => (
            <span className={styles.columnInner}>
              Last visit
              <SortIcon direction={sortDirection} />
            </span>
          )}
        </Column>
        <Column id="status" className={styles.column}>
          Status
        </Column>
        <Column id="actions" className={styles.column}>
          <span className="visually-hidden">Actions</span>
        </Column>
      </TableHeader>
      <TableBody items={items}>
        {(patient) => (
          <Row
            id={patient.id}
            textValue={listName(patient)}
            className={styles.row}
            onAction={() => onOpen(patient.id)}
          >
            <Cell className={styles.cell}>
              <Link href={`/patients/${patient.id}`} className={styles.name}>
                {listName(patient)}
              </Link>
            </Cell>
            <Cell className={styles.cell}>
              <span className={styles.age}>{formatAge(patient.date_of_birth)}</span>
              <span className={styles.meta}>{formatDate(patient.date_of_birth)}</span>
            </Cell>
            <Cell className={styles.cell}>
              {patient.last_visit ? (
                formatDate(patient.last_visit)
              ) : (
                <span className={styles.muted}>No visits</span>
              )}
            </Cell>
            <Cell className={styles.cell}>
              <StatusBadge status={patient.status} />
            </Cell>
            <Cell className={styles.cell}>
              <ActionMenu
                label={`More actions for ${listName(patient)}`}
                items={[
                  { id: 'open', label: 'Open', icon: <User />, href: `/patients/${patient.id}` },
                  {
                    id: 'edit',
                    label: 'Edit',
                    icon: <Pencil />,
                    href: `/patients/${patient.id}/edit`,
                  },
                  {
                    id: 'archive',
                    label: 'Archive patient…',
                    icon: <Archive />,
                    danger: true,
                    disabled: offline,
                    hint: 'Not available offline',
                  },
                ]}
                onAction={(id) => {
                  if (id === 'archive') onArchive(patient);
                }}
              />
            </Cell>
          </Row>
        )}
      </TableBody>
    </Table>
  );
}

import { Search } from 'lucide-react';
import { Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { Button } from '../ui/Button';
import styles from './Header.module.css';
import { PatientSearch } from './PatientSearch';

/** The icon that opens the search in a popover (medium, compact, and on the list page). */
export default function SearchPopover() {
  return (
    <DialogTrigger>
      <Button variant="quiet" aria-label="Find a patient">
        <Search />
      </Button>
      <Popover className={styles.searchPopover} placement="bottom end">
        <Dialog aria-label="Find a patient" className={styles.searchDialog}>
          <PatientSearch autoFocus />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

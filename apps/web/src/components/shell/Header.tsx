import { Link as RouterLink, useRouterState } from '@tanstack/react-router';
import { Menu, Plus, Search } from 'lucide-react';
import { Dialog, DialogTrigger, Popover } from 'react-aria-components';
import { useLayout } from '../../lib/layout';
import { Button, buttonClass } from '../ui/Button';
import styles from './Header.module.css';
import { Logo } from './Logo';
import { PatientSearch } from './PatientSearch';

interface HeaderProps {
  /** Opens the compact navigation drawer. */
  onOpenMenu: () => void;
}

/** The icon that opens the search in a popover (medium, compact, and on the list page). */
function SearchPopover() {
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

export function Header({ onOpenMenu }: HeaderProps) {
  const layout = useLayout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // On the list page the search field collapses to an icon, because the list has its own.
  const inlineSearch = layout === 'wide' && pathname !== '/patients';

  return (
    <header className={styles.header}>
      {layout === 'compact' && (
        <Button variant="quiet" aria-label="Open navigation menu" onPress={onOpenMenu}>
          <Menu />
        </Button>
      )}
      <RouterLink to="/" className={styles.brand}>
        <Logo />
        Patient Registry
      </RouterLink>
      {inlineSearch && (
        <div className={styles.search}>
          <PatientSearch hideLabel />
        </div>
      )}
      <div className={styles.spacer} />
      {!inlineSearch && <SearchPopover />}
      <RouterLink to="/patients/new" className={`${buttonClass('primary')} ${styles.newPatient}`}>
        <Plus />
        <span className={styles.newLabel}>New patient</span>
      </RouterLink>
      {/* Reserved for a future user menu: 36px, renders nothing in v1. */}
      {layout !== 'compact' && <div className={styles.userSlot} data-slot="user-menu" />}
    </header>
  );
}

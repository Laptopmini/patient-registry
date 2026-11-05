import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay, RouterProvider } from 'react-aria-components';
import { useIsWide } from '../../lib/useMediaQuery';
import { Button, buttonClass } from '../ui/Button';
import { OfflineBanner } from './OfflineBanner';
import styles from './Shell.module.css';
import { SideNav } from './SideNav';
import { ToastRegion } from './ToastRegion';

/** Moves focus to the page's h1 whenever the path changes, so screen reader users land on the new page. */
function useFocusHeadingOnNavigation() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [pathname]);
  return pathname;
}

function NavDrawer({ pathname }: { pathname: string }) {
  const [isOpen, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the drawer after navigating.
  if (isOpen && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  return (
    <>
      <Button
        aria-label="Open navigation menu"
        onPress={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
      >
        <span aria-hidden="true">☰</span>
      </Button>
      <ModalOverlay isOpen={isOpen} onOpenChange={setOpen} isDismissable className={styles.overlay}>
        <Modal className={styles.drawer}>
          <Dialog aria-label="Navigation menu" className={styles.drawerDialog}>
            {({ close }) => (
              <>
                <div className={styles.drawerHeader}>
                  <Heading slot="title" level={2}>
                    Menu
                  </Heading>
                  <Button aria-label="Close navigation menu" onPress={close}>
                    <span aria-hidden="true">×</span>
                  </Button>
                </div>
                <SideNav />
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

export function Shell() {
  const router = useRouter();
  const isWide = useIsWide();
  const pathname = useFocusHeadingOnNavigation();

  return (
    // Lets React Aria links and table rows navigate through TanStack Router.
    <RouterProvider
      navigate={(to) => router.history.push(to)}
      useHref={(to) => router.history.createHref(to)}
    >
      <div className={styles.shell}>
        <a href="#main" className={styles.skip}>
          Skip to main content
        </a>
        <header className={styles.header}>
          {!isWide && <NavDrawer pathname={pathname} />}
          <Link to="/" className={styles.brand}>
            Patient Registry
          </Link>
          <div className={styles.headerActions}>
            <Link to="/patients/new" className={buttonClass('primary')}>
              New patient
            </Link>
            {/* Placeholder slot for a future user menu. */}
            <div className={styles.userMenu} data-slot="user-menu" />
          </div>
        </header>
        <OfflineBanner />
        <div className={styles.body}>
          {isWide && (
            <div className={styles.sidebar}>
              <SideNav />
            </div>
          )}
          <main id="main" tabIndex={-1} className={styles.main}>
            <Outlet />
          </main>
        </div>
        <ToastRegion />
      </div>
    </RouterProvider>
  );
}

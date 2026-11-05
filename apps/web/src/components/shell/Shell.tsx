import { Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay, RouterProvider } from 'react-aria-components';
import { LayoutProvider, useContainerLayout, useLayout } from '../../lib/layout';
import { Button } from '../ui/Button';
import { Header } from './Header';
import { Logo } from './Logo';
import { MainNav } from './MainNav';
import { OfflineBanner } from './OfflineBanner';
import styles from './Shell.module.css';
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

/** The compact navigation: a drawer from the start edge, opened by the header's menu button. */
function NavDrawer({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={styles.overlay}
    >
      <Modal className={styles.drawer}>
        <Dialog aria-label="Navigation menu" className={styles.drawerDialog}>
          {({ close }) => (
            <>
              <div className={styles.drawerHeader}>
                <Heading slot="title" level={2} className={styles.drawerTitle}>
                  <Logo />
                  Patient Registry
                </Heading>
                <Button variant="quiet" aria-label="Close navigation menu" onPress={close}>
                  <X />
                </Button>
              </div>
              <MainNav variant="drawer" />
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function ShellBody({ pathname }: { pathname: string }) {
  const layout = useLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the drawer after navigating.
  if (drawerOpen && openedAt !== pathname) {
    setDrawerOpen(false);
    setOpenedAt(pathname);
  }

  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to main content
      </a>
      <Header
        onOpenMenu={() => {
          setOpenedAt(pathname);
          setDrawerOpen(true);
        }}
      />
      <OfflineBanner />
      <div className={styles.body}>
        {layout !== 'compact' && (
          <div className={styles.nav}>
            <MainNav variant={layout === 'wide' ? 'sidebar' : 'rail'} />
          </div>
        )}
        <main id="main" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
      {layout === 'compact' && <NavDrawer isOpen={drawerOpen} onOpenChange={setDrawerOpen} />}
    </>
  );
}

export function Shell() {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const layout = useContainerLayout(shellRef);
  const pathname = useFocusHeadingOnNavigation();

  return (
    // Lets React Aria links and table rows navigate through TanStack Router.
    <RouterProvider
      navigate={(to) => router.history.push(to)}
      useHref={(to) => router.history.createHref(to)}
    >
      <LayoutProvider layout={layout}>
        {/* The app container: `@container app (…)` rules in every module respond to its width. */}
        <div ref={shellRef} className={styles.shell}>
          <ShellBody pathname={pathname} />
        </div>
        {/* Outside the container, so `position: fixed` is relative to the viewport. */}
        <ToastRegion />
      </LayoutProvider>
    </RouterProvider>
  );
}

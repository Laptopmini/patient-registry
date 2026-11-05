import { Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-aria-components';
import { LayoutProvider, useContainerLayout, useLayout } from '../../lib/layout';
import { Header } from './Header';
import { MainNav } from './MainNav';
import { OfflineBanner } from './OfflineBanner';
import styles from './Shell.module.css';

// Compact-only and on-demand code stays out of the entry chunk.
const NavDrawer = lazy(() => import('./NavDrawer'));
const ToastRegion = lazy(() => import('./ToastRegion'));

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
            <div className={styles.navSticky}>
              <MainNav variant={layout === 'wide' ? 'sidebar' : 'rail'} />
            </div>
          </div>
        )}
        <main id="main" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
      {layout === 'compact' && drawerOpen && (
        <Suspense fallback={null}>
          <NavDrawer isOpen={drawerOpen} onOpenChange={setDrawerOpen} />
        </Suspense>
      )}
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
        <Suspense fallback={null}>
          <ToastRegion />
        </Suspense>
      </LayoutProvider>
    </RouterProvider>
  );
}

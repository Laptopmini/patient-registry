import { useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Users } from 'lucide-react';
import { Link } from 'react-aria-components';
import { Tooltip } from '../ui/Tooltip';
import styles from './MainNav.module.css';

type NavVariant = 'sidebar' | 'rail' | 'drawer';

const ITEMS = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', Icon: Users },
] as const;

/** `page` on the exact page, `true` on its detail and form pages, nothing elsewhere. */
function currentFor(href: string, pathname: string): 'page' | 'true' | undefined {
  if (pathname === href) return 'page';
  if (href !== '/' && pathname.startsWith(`${href}/`)) return 'true';
  return undefined;
}

/**
 * The primary navigation. A wide sidebar shows labels; the medium rail hides them visually
 * (they stay as accessible names) and shows each in a tooltip; the compact drawer reuses
 * the sidebar look.
 */
export function MainNav({ variant }: { variant: NavVariant }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rail = variant === 'rail';

  return (
    <nav aria-label="Main" className={`${styles.nav} ${rail ? styles.rail : ''}`}>
      <ul className={styles.list}>
        {ITEMS.map(({ href, label, Icon }) => {
          const current = currentFor(href, pathname);
          const link = (
            <Link
              href={href}
              className={styles.link}
              {...(current ? { 'aria-current': current } : {})}
            >
              <Icon className={styles.icon} />
              <span className={rail ? styles.railLabel : styles.label}>{label}</span>
              {!rail && <span className={styles.dot} aria-hidden="true" />}
            </Link>
          );
          return <li key={href}>{rail ? <Tooltip text={label}>{link}</Tooltip> : link}</li>;
        })}
      </ul>
    </nav>
  );
}

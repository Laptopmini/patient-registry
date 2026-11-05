import { ChevronRight } from 'lucide-react';
import { Breadcrumbs as AriaBreadcrumbs, Breadcrumb, Link } from 'react-aria-components';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  /** Omit on the last item: it is the current page. */
  href?: string;
}

/** "Patients › Ana Terry". Links go through the router; the last item is `aria-current="page"`. */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <AriaBreadcrumbs className={styles.list}>
      {items.map((item, index) => (
        <Breadcrumb key={item.label} className={styles.item}>
          <Link
            {...(item.href && index < items.length - 1 ? { href: item.href } : {})}
            className={styles.link}
          >
            {item.label}
          </Link>
          {index < items.length - 1 && <ChevronRight className={styles.separator} />}
        </Breadcrumb>
      ))}
    </AriaBreadcrumbs>
  );
}

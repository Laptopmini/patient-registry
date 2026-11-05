import { Link } from '@tanstack/react-router';
import styles from './PatientList.module.css';

/** A page number, or a collapsed run of pages keyed by the page before it. */
type PageItem = number | { gapAfter: number };

/** First, last and the pages around the current one, with gaps collapsed. */
export function pageItems(current: number, total: number): PageItem[] {
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items: PageItem[] = [];
  let previous = 0;
  for (const page of pages) {
    if (previous !== 0 && page - previous === 2) items.push(previous + 1);
    else if (previous !== 0 && page - previous > 2) items.push({ gapAfter: previous });
    items.push(page);
    previous = page;
  }
  return items;
}

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      <ul className={styles.pageList}>
        <li>
          {page > 1 ? (
            <Link
              to="/patients"
              search={(prev) => ({ ...prev, page: page - 1 })}
              className={styles.page}
              rel="prev"
            >
              Previous
            </Link>
          ) : (
            <span className={`${styles.page} ${styles.pageDisabled}`} aria-disabled="true">
              Previous
            </span>
          )}
        </li>
        {pageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <Link
                to="/patients"
                search={(prev) => ({ ...prev, page: item })}
                className={styles.page}
                aria-label={`Page ${item}`}
                {...(item === page ? { 'aria-current': 'page' as const } : {})}
              >
                {item}
              </Link>
            </li>
          ) : (
            <li key={`gap-${item.gapAfter}`} aria-hidden="true">
              …
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link
              to="/patients"
              search={(prev) => ({ ...prev, page: page + 1 })}
              className={styles.page}
              rel="next"
            >
              Next
            </Link>
          ) : (
            <span className={`${styles.page} ${styles.pageDisabled}`} aria-disabled="true">
              Next
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

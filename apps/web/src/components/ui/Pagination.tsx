import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-aria-components';
import styles from './Pagination.module.css';

/** A page number, or a collapsed run of pages keyed by the page before it. */
type PageItem = number | { gapAfter: number };

/** First, last and the pages around the current one, with gaps collapsed: 1 … 4 5 6 … 50. */
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
  total: number;
  pageSize: number;
  /** The URL of a page; each page is a real link. */
  hrefFor: (page: number) => string;
}

export function Pagination({ page, totalPages, total, pageSize, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      <p className={styles.summary}>
        Showing {first}–{last} of {total}
      </p>
      <ul className={styles.list}>
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={styles.page} rel="prev">
              <ChevronLeft />
              <span className={styles.edgeLabel}>Previous</span>
            </Link>
          ) : (
            <span className={`${styles.page} ${styles.disabled}`} aria-disabled="true">
              <ChevronLeft />
              <span className={styles.edgeLabel}>Previous</span>
            </span>
          )}
        </li>
        {pageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <li key={item} className={styles.number}>
              <Link
                href={hrefFor(item)}
                className={styles.page}
                aria-label={`Page ${item}`}
                {...(item === page ? { 'aria-current': 'page' as const } : {})}
              >
                {item}
              </Link>
            </li>
          ) : (
            <li key={`gap-${item.gapAfter}`} className={styles.number} aria-hidden="true">
              <span className={styles.gap}>…</span>
            </li>
          ),
        )}
        <li className={styles.compactStatus}>
          <span>
            Page {page} of {totalPages}
          </span>
        </li>
        <li>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className={styles.page} rel="next">
              <span className={styles.edgeLabel}>Next</span>
              <ChevronRight />
            </Link>
          ) : (
            <span className={`${styles.page} ${styles.disabled}`} aria-disabled="true">
              <span className={styles.edgeLabel}>Next</span>
              <ChevronRight />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

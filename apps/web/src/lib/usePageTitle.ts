import { useEffect } from 'react';

const SUFFIX = 'Patient Registry';

/** Sets `document.title` to "<Page> · Patient Registry" while the page is mounted. */
export function usePageTitle(page: string | undefined) {
  useEffect(() => {
    if (!page) return;
    document.title = `${page} · ${SUFFIX}`;
  }, [page]);
}

import { useSyncExternalStore } from 'react';

/** Subscribes to a CSS media query. Returns `false` where `matchMedia` is unavailable. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}

export const WIDE_QUERY = '(min-width: 768px)';

/** True from 768px up: the table list and the persistent sidebar. */
export const useIsWide = () => useMediaQuery(WIDE_QUERY);

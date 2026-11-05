import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/** True when the user asked for no motion. Checked at call time, never cached. */
export const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canTransition = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !prefersReducedMotion();

/**
 * Runs a DOM update inside a View Transition, so elements with a `view-transition-name`
 * animate between the before and after states. Under `prefers-reduced-motion: reduce`
 * (or without the API) the update just runs, with nothing animated.
 *
 * `settle` is for updates that reach React asynchronously (TanStack Query cache writes
 * notify on the next tick): the transition waits briefly so the new DOM is in place
 * before the "after" snapshot is taken.
 */
export function withViewTransition(update: () => void, { settle = false } = {}) {
  if (!canTransition()) {
    update();
    return;
  }
  document.startViewTransition(async () => {
    flushSync(update);
    if (settle) await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

/**
 * The latest value, but swapped in inside a View Transition, so a results region cross-fades
 * when new data lands. The first value is returned immediately; there is nothing to animate from.
 */
export function useTransitioned<T>(value: T): T {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (value === shown) return;
    if (shown === undefined) setShown(value);
    else withViewTransition(() => setShown(value));
  }, [value, shown]);
  return shown === undefined ? value : shown;
}

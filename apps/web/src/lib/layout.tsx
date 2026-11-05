import {
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useLayoutEffect,
  useState,
} from 'react';

/** Token breakpoints (`--bp-medium`, `--bp-wide` in tokens.css). */
export const BP_MEDIUM = 768;
export const BP_WIDE = 1280;

export type Layout = 'compact' | 'medium' | 'wide';

export const layoutFor = (width: number): Layout =>
  width >= BP_WIDE ? 'wide' : width >= BP_MEDIUM ? 'medium' : 'compact';

/**
 * Before the shell has been measured, ask the media queries. (They include the scrollbar,
 * the container does not, so the measured value takes over as soon as it exists.)
 */
function guessLayout(): Layout {
  if (typeof window.matchMedia !== 'function') return 'wide';
  if (window.matchMedia(`(min-width: ${BP_WIDE}px)`).matches) return 'wide';
  if (window.matchMedia(`(min-width: ${BP_MEDIUM}px)`).matches) return 'medium';
  return 'compact';
}

/**
 * The layout of the app container (the element that has `container-name: app`), measured
 * with a ResizeObserver so structural choices in React (sidebar, rail or drawer; table or
 * cards) always agree with the `@container app` rules in CSS, including at 200% zoom.
 */
export function useContainerLayout(ref: RefObject<HTMLElement | null>): Layout {
  const [layout, setLayout] = useState<Layout>(guessLayout);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = (width: number) => setLayout(layoutFor(width));
    measure(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) measure(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return layout;
}

const LayoutContext = createContext<Layout>('wide');

export function LayoutProvider({ layout, children }: { layout: Layout; children: ReactNode }) {
  return <LayoutContext value={layout}>{children}</LayoutContext>;
}

/** The current layout: compact (360–767), medium (768–1279) or wide (1280 and up). */
export const useLayout = () => use(LayoutContext);

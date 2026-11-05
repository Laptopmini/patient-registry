import { withViewTransition } from './viewTransition';

type TransitionDocument = { startViewTransition?: (callback: () => void) => void };

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
  }));
}

describe('withViewTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as TransitionDocument).startViewTransition;
  });

  it('wraps the update in a View Transition when motion is allowed', () => {
    setReducedMotion(false);
    const start = vi.fn((callback: () => void) => void callback());
    (document as TransitionDocument).startViewTransition = start;
    const update = vi.fn();
    withViewTransition(update);
    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it('updates directly, without starting a transition, under prefers-reduced-motion', () => {
    setReducedMotion(true);
    const start = vi.fn();
    (document as TransitionDocument).startViewTransition = start;
    const update = vi.fn();
    withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });

  it('updates directly when the browser has no View Transitions', () => {
    setReducedMotion(false);
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledOnce();
  });
});

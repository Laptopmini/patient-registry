import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';
import { withViewTransition } from './viewTransition';

export interface ToastValue {
  title: string;
  kind: 'success' | 'error';
}

/** The app's single toast queue, rendered by `ToastRegion` in the shell. */
export const toastQueue = new ToastQueue<ToastValue>({
  maxVisibleToasts: 3,
  // Toasts enter and leave through a View Transition (nothing animates under reduced motion).
  wrapUpdate: (update) => withViewTransition(update),
});

export const showToast = (title: string, kind: ToastValue['kind'] = 'success') =>
  toastQueue.add({ title, kind }, { timeout: kind === 'error' ? 8000 : 5000 });

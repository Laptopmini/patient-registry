import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';

export interface ToastValue {
  title: string;
  kind: 'success' | 'error';
}

/** The app's single toast queue, rendered by `ToastRegion` in the shell. */
export const toastQueue = new ToastQueue<ToastValue>({ maxVisibleToasts: 4 });

export const showToast = (title: string, kind: ToastValue['kind'] = 'success') =>
  toastQueue.add({ title, kind }, { timeout: kind === 'error' ? 8000 : 5000 });

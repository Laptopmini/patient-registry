import { CircleAlert, CircleCheck, X } from 'lucide-react';
import {
  Button,
  UNSTABLE_ToastRegion as Region,
  Text,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastList as ToastList,
} from 'react-aria-components';
import { type ToastValue, toastQueue } from '../../lib/toast';
import styles from './ToastRegion.module.css';

/** Bottom-right on wide and medium, full width on compact. Failures stay until dismissed. */
export default function ToastRegion() {
  return (
    <Region<ToastValue> queue={toastQueue} className={styles.region} aria-label="Notifications">
      <ToastList<ToastValue> className={styles.list}>
        {({ toast }) => (
          <Toast toast={toast} className={styles.toast}>
            {toast.content.kind === 'error' ? <CircleAlert /> : <CircleCheck />}
            <ToastContent className={styles.content}>
              <Text slot="title">
                {toast.content.kind === 'error' ? 'Error: ' : ''}
                {toast.content.title}
              </Text>
            </ToastContent>
            <Button slot="close" aria-label="Dismiss notification" className={styles.close}>
              <X />
            </Button>
          </Toast>
        )}
      </ToastList>
    </Region>
  );
}

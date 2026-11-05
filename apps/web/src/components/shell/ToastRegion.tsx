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

export function ToastRegion() {
  return (
    <Region<ToastValue> queue={toastQueue} className={styles.region} aria-label="Notifications">
      <ToastList<ToastValue> className={styles.list}>
        {({ toast }) => (
          <Toast
            toast={toast}
            className={`${styles.toast} ${toast.content.kind === 'error' ? styles.error : styles.success}`}
          >
            <ToastContent className={styles.content}>
              <Text slot="title">
                {toast.content.kind === 'error' ? 'Error: ' : ''}
                {toast.content.title}
              </Text>
            </ToastContent>
            <Button slot="close" aria-label="Dismiss notification">
              <span aria-hidden="true">×</span>
            </Button>
          </Toast>
        )}
      </ToastList>
    </Region>
  );
}

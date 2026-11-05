import { X } from 'lucide-react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from '../ui/Button';
import { Logo } from './Logo';
import { MainNav } from './MainNav';
import styles from './Shell.module.css';

/** The compact navigation: a drawer from the start edge, opened by the header's menu button. */
export default function NavDrawer({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={styles.overlay}
    >
      <Modal className={styles.drawer}>
        <Dialog aria-label="Navigation menu" className={styles.drawerDialog}>
          {({ close }) => (
            <>
              <div className={styles.drawerHeader}>
                <Heading slot="title" level={2} className={styles.drawerTitle}>
                  <Logo />
                  Patient Registry
                </Heading>
                <Button variant="quiet" aria-label="Close navigation menu" onPress={close}>
                  <X />
                </Button>
              </div>
              <MainNav variant="drawer" />
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

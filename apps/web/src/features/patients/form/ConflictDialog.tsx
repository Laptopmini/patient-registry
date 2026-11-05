import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from '../../../components/ui/Button';
import dialogStyles from '../../../components/ui/ConfirmDialog.module.css';

interface ConflictDialogProps {
  isOpen: boolean;
  isBusy: boolean;
  onReload: () => void;
  onOverwrite: () => void;
}

/** Shown when the server answers 412: someone else saved this patient first. */
export function ConflictDialog({ isOpen, isBusy, onReload, onOverwrite }: ConflictDialogProps) {
  return (
    <ModalOverlay isOpen={isOpen} className={dialogStyles.overlay}>
      <Modal className={dialogStyles.modal}>
        <Dialog role="alertdialog" className={dialogStyles.dialog}>
          <Heading slot="title">This patient was changed by someone else</Heading>
          <p>
            Someone saved this record while you were editing. You can load their version and lose
            your edits, or save yours over theirs.
          </p>
          <div className={dialogStyles.actions}>
            <Button isDisabled={isBusy} onPress={onReload}>
              Reload their version
            </Button>
            <Button variant="danger" isDisabled={isBusy} onPress={onOverwrite}>
              Overwrite with mine
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

import { TriangleAlert } from 'lucide-react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from '../../../components/ui/Button';
import dialogStyles from '../../../components/ui/ConfirmDialog.module.css';

interface ConflictDialogProps {
  isOpen: boolean;
  isBusy: boolean;
  patientName: string;
  onReload: () => void;
  onOverwrite: () => void;
}

/**
 * Shown when the server answers 412: someone else saved this patient first. Focus starts
 * on the safe choice, "Load their latest changes". There is no dismiss: one choice is needed.
 */
export function ConflictDialog({
  isOpen,
  isBusy,
  patientName,
  onReload,
  onOverwrite,
}: ConflictDialogProps) {
  return (
    <ModalOverlay isOpen={isOpen} className={dialogStyles.overlay}>
      <Modal className={`${dialogStyles.modal} ${dialogStyles.wide}`}>
        <Dialog role="alertdialog" className={dialogStyles.dialog}>
          <span className={dialogStyles.iconCircle}>
            <TriangleAlert aria-hidden="true" />
          </span>
          <Heading slot="title" className={dialogStyles.title}>
            Someone else saved this record
          </Heading>
          <div className={dialogStyles.body}>
            <p>
              Another person saved changes to {patientName} while you were editing. Choose which
              version to keep.
            </p>
            <ul className={dialogStyles.options}>
              <li>
                <strong>Load their latest changes</strong> discards your unsaved changes.
              </li>
              <li>
                <strong>Overwrite with mine</strong> replaces their changes with yours.
              </li>
            </ul>
          </div>
          <div className={dialogStyles.actions}>
            <Button isDisabled={isBusy} onPress={onOverwrite}>
              Overwrite with mine
            </Button>
            <Button variant="primary" autoFocus isDisabled={isBusy} onPress={onReload}>
              Load their latest changes
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

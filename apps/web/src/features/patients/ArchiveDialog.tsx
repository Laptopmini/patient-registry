import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface ArchiveDialogProps {
  /** The patient's name as shown in headings ("Ana Terry"). */
  name: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

/** "Archive Ana Terry?" Cancel has initial focus; the confirm button is solid red. */
export function ArchiveDialog({
  name,
  isOpen,
  onOpenChange,
  isPending,
  onConfirm,
}: ArchiveDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={`Archive ${name}?`}
      confirmLabel="Archive patient"
      destructive
      isPending={isPending}
      onConfirm={onConfirm}
    >
      <p>Archived patients are hidden from every screen, including search. Their notes are kept.</p>
    </ConfirmDialog>
  );
}

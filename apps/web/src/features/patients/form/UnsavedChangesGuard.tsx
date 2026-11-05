import { useBlocker } from '@tanstack/react-router';
import type { RefObject } from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

interface UnsavedChangesGuardProps {
  /** The form has edits that were not saved. */
  isDirty: boolean;
  /** Set to true right before navigating away after a successful save. */
  savedRef: RefObject<boolean>;
  /** Only moves between pages count: the wizard changes `?step=` on the same page. */
  pathname: string;
}

/**
 * Confirms before a dirty form is left (ADR 0012): an in-app dialog for router navigation
 * (links, Back and Forward) and the browser's own prompt for reload and close. Nothing is
 * written to browser storage; the edits live in the form's memory only.
 */
export function UnsavedChangesGuard({ isDirty, savedRef, pathname }: UnsavedChangesGuardProps) {
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => !savedRef.current && next.pathname !== pathname,
    enableBeforeUnload: () => isDirty && !savedRef.current,
    disabled: !isDirty,
    withResolver: true,
  });

  return (
    <ConfirmDialog
      isOpen={blocker.status === 'blocked'}
      onOpenChange={(isOpen) => {
        if (!isOpen) blocker.reset?.();
      }}
      title="Leave without saving?"
      cancelLabel="Keep editing"
      confirmLabel="Discard changes"
      destructive
      onConfirm={() => blocker.proceed?.()}
    >
      <p>You have changes that haven’t been saved. If you leave now, they will be lost.</p>
    </ConfirmDialog>
  );
}

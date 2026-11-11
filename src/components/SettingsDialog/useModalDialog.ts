import { useEffect, type RefObject } from "react";

/**
 * Shows a native <dialog> as a modal for as long as the component is
 * mounted. The browser then keeps focus inside it and makes the page behind
 * it inert. Escape fires "cancel", which the component should handle by
 * unmounting the dialog, so React state stays the single source of truth.
 *
 * Focus moves to `initialFocus` on open and back to whatever had it before
 * on close, so keyboard users land where they started.
 */
export function useModalDialog(
  dialogRef: RefObject<HTMLDialogElement | null>,
  initialFocus: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    initialFocus.current?.focus();

    return () => {
      dialog.close();
      opener?.focus();
    };
  }, [dialogRef, initialFocus]);
}

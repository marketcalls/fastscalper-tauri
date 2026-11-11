/**
 * jsdom has an HTMLDialogElement without behaviour. This models the parts of
 * the HTML spec the app relies on, so tests can drive the settings dialog
 * the way a user would in the real webview:
 *
 * - showModal() and close() toggle the `open` attribute;
 * - close() fires "close";
 * - Escape fires a cancelable "cancel" at the top-most modal dialog and,
 *   unless a handler prevents it, closes that dialog.
 */
export function installDialogPolyfill(): void {
  const modals: HTMLDialogElement[] = [];

  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    if (this.hasAttribute("open"))
      throw new DOMException("Dialog is already open", "InvalidStateError");
    this.setAttribute("open", "");
    modals.push(this);
  };

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    modals.splice(modals.indexOf(this), 1);
    this.dispatchEvent(new Event("close"));
  };

  document.addEventListener("keydown", (event) => {
    const top = modals.at(-1);
    if (event.key !== "Escape" || top === undefined) return;
    const cancel = new Event("cancel", { cancelable: true });
    if (top.dispatchEvent(cancel)) top.close();
  });
}

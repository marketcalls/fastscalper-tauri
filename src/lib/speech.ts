/**
 * Speaks a short alert with the Web Speech API. Any alert still playing is
 * cut off first, so what you hear always matches the latest button pressed.
 * Does nothing on webviews without speech support (for example WebKitGTK).
 */
export function speak(text: string): void {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

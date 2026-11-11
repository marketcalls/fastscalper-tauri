import { vi } from "vitest";

/**
 * Replaces the Web Speech API (missing in jsdom) with spies. `spoken` lists
 * the phrases spoken, in order. Globals are restored after each test by the
 * `unstubGlobals` option in vitest.config.ts.
 */
export function installFakeSpeech() {
  const spoken: string[] = [];
  const cancel = vi.fn();

  class FakeUtterance {
    constructor(readonly text: string) {}
  }

  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    cancel,
    speak: (utterance: FakeUtterance) => {
      spoken.push(utterance.text);
    },
  });
  return { spoken, cancel };
}

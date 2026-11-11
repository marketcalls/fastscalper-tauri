import { describe, expect, it, vi } from "vitest";
import { installFakeSpeech } from "../test/fakeSpeech";
import { speak } from "./speech";

describe("speak", () => {
  it("cuts off the previous alert and speaks the new one", () => {
    const { spoken, cancel } = installFakeSpeech();

    speak("Buy Order");

    expect(cancel).toHaveBeenCalledOnce();
    expect(spoken).toEqual(["Buy Order"]);
  });

  it("does nothing where the webview has no speech support", () => {
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    expect(() => {
      speak("Buy Order");
    }).not.toThrow();
  });
});

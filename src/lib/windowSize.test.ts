import { describe, expect, it, vi } from "vitest";
import { installFakeBackend, rejectWith } from "../test/fakeBackend";
import { growWindowUntilReleased } from "./windowSize";

interface LogicalSizeArg {
  Logical: { width: number; height: number };
}

/** A window whose inner size really changes when set_size is called. */
function installFakeWindow(initial: { width: number; height: number }, scaleFactor = 1) {
  const size = { ...initial };
  const resizes: { width: number; height: number }[] = [];
  installFakeBackend({
    "plugin:window|scale_factor": () => scaleFactor,
    "plugin:window|inner_size": () => ({
      width: size.width * scaleFactor,
      height: size.height * scaleFactor,
    }),
    "plugin:window|set_size": (args) => {
      // The API sends a LogicalSize object; JSON gives its wire form.
      const { Logical } = JSON.parse(
        JSON.stringify((args as { value: unknown }).value),
      ) as LogicalSizeArg;
      Object.assign(size, Logical);
      resizes.push({ ...Logical });
      return null;
    },
  });
  return { size, resizes };
}

describe("growWindowUntilReleased", () => {
  it("grows the window, then restores the size it had, in logical pixels", async () => {
    const fake = installFakeWindow({ width: 320, height: 125 }, 2);

    const release = growWindowUntilReleased({ width: 340, height: 300 });
    await vi.waitFor(() => {
      expect(fake.size).toEqual({ width: 340, height: 300 });
    });

    release();
    await vi.waitFor(() => {
      expect(fake.size).toEqual({ width: 320, height: 125 });
    });
    expect(fake.resizes).toEqual([
      { width: 340, height: 300 },
      { width: 320, height: 125 },
    ]);
  });

  it("never shrinks a window the user has made larger", async () => {
    const fake = installFakeWindow({ width: 500, height: 125 });

    const release = growWindowUntilReleased({ width: 340, height: 300 });
    await vi.waitFor(() => {
      expect(fake.size).toEqual({ width: 500, height: 300 });
    });
    release();
    await vi.waitFor(() => {
      expect(fake.size).toEqual({ width: 500, height: 125 });
    });
  });

  it("leaves a window that is already big enough alone", async () => {
    const fake = installFakeWindow({ width: 800, height: 600 });

    const release = growWindowUntilReleased({ width: 340, height: 300 });
    release();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fake.resizes).toEqual([]);
  });

  it("restores correctly when released and grown again at once, as React effects do", async () => {
    const fake = installFakeWindow({ width: 320, height: 125 });

    growWindowUntilReleased({ width: 340, height: 300 })();
    const release = growWindowUntilReleased({ width: 340, height: 300 });
    await vi.waitFor(() => {
      expect(fake.resizes).toHaveLength(3);
    });
    expect(fake.size).toEqual({ width: 340, height: 300 });

    release();
    await vi.waitFor(() => {
      expect(fake.size).toEqual({ width: 320, height: 125 });
    });
  });

  it("swallows failures, so callers simply keep the current size", async () => {
    const calls = installFakeBackend({
      "plugin:window|set_size": () => rejectWith("not allowed"),
    });

    const release = growWindowUntilReleased({ width: 340, height: 300 });
    release();

    await vi.waitFor(() => {
      expect(calls.some((call) => call.cmd === "plugin:window|set_size")).toBe(true);
    });
  });
});

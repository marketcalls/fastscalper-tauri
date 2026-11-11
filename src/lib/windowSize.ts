/**
 * Temporarily enlarges the app window, for panels that do not fit the
 * compact order pad (such as Settings), and puts the old size back after.
 */
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

/** A size in logical (CSS) pixels. */
export interface WindowSize {
  width: number;
  height: number;
}

// Size changes run one at a time, so a restore can never overtake the grow
// it undoes (React runs effect cleanups and re-runs back to back).
let queue: Promise<unknown> = Promise.resolve();

function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function readInnerSize(): Promise<WindowSize> {
  const appWindow = getCurrentWindow();
  const physical = await appWindow.innerSize();
  const { width, height } = physical.toLogical(await appWindow.scaleFactor());
  return { width, height };
}

async function resize({ width, height }: WindowSize): Promise<void> {
  await getCurrentWindow().setSize(new LogicalSize(width, height));
}

/** Grows the window to at least `minimum`. Resolves with the size to restore, or null if unchanged. */
async function grow(minimum: WindowSize): Promise<WindowSize | null> {
  const current = await readInnerSize();
  const target = {
    width: Math.max(current.width, minimum.width),
    height: Math.max(current.height, minimum.height),
  };
  if (target.width === current.width && target.height === current.height) return null;
  await resize(target);
  return current;
}

/**
 * Grows the window to at least `minimum` and returns a function that puts
 * back the size it had before. Never throws: if the window cannot be resized
 * the caller keeps the current size, so its content must be able to scroll.
 */
export function growWindowUntilReleased(minimum: WindowSize): () => void {
  const previous = inTurn(() => grow(minimum)).catch(() => null);
  return () => {
    void inTurn(async () => {
      const size = await previous;
      if (size !== null) await resize(size);
    }).catch(() => undefined);
  };
}

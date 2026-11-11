import { useEffect } from "react";
import { growWindowUntilReleased, type WindowSize } from "./windowSize";

/** Keeps the window at least `minimum` in size while the calling component is mounted. */
export function useGrownWindow(minimum: WindowSize): void {
  const { width, height } = minimum;
  useEffect(() => growWindowUntilReleased({ width, height }), [width, height]);
}

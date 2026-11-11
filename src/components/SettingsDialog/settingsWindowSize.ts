import type { WindowSize } from "../../lib/windowSize";

/**
 * The order pad window is far too small for the Settings form, so the window
 * grows to this size (logical pixels) while Settings is open, then shrinks
 * back. Measured to fit the form with both inline errors and a test result
 * showing, without scrolling.
 */
export const SETTINGS_WINDOW_SIZE: Readonly<WindowSize> = { width: 340, height: 300 };

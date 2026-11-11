import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { createStatus, errorText, type Status } from "../feedback/status";

/** Keeps the app window above other windows while `enabled` is true. */
export function useAlwaysOnTop(enabled: boolean, report: (status: Status) => void): void {
  useEffect(() => {
    setAlwaysOnTop(enabled).catch((error: unknown) => {
      report(
        createStatus("warning", "Could not change the always-on-top setting.", errorText(error)),
      );
    });
  }, [enabled, report]);
}

// Async so that a missing Tauri runtime (plain `npm run dev` in a browser)
// becomes a reported rejection instead of an uncaught exception in the effect.
async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

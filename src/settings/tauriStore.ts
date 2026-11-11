import { appConfigDir, join } from "@tauri-apps/api/path";
import { load } from "@tauri-apps/plugin-store";
import type { KeyValueStore } from "./storage";

const SETTINGS_FILE_NAME = "settings.json";

/**
 * Opens settings.json in the app config directory, for example
 * %APPDATA%\com.fastscalper.app on Windows or ~/.config/com.fastscalper.app
 * on Linux. The store plugin resolves relative paths against the app data
 * directory, so an absolute path is passed to keep the file where people
 * look for configuration they can edit by hand.
 */
export async function openSettingsStore(): Promise<KeyValueStore> {
  const path = await join(await appConfigDir(), SETTINGS_FILE_NAME);
  // Saves are explicit, so a failed write reaches the caller and can be reported.
  return load(path, { autoSave: false, defaults: {} });
}

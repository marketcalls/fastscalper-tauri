/**
 * Loads and saves settings and the last ticket. The rest of the app depends
 * on `SettingsStorage` only, never on the store plugin directly.
 */
import { errorText } from "../feedback/status";
import { DEFAULT_TICKET, type Ticket } from "../trading/ticket";
import {
  LEGACY_STORAGE_KEY,
  parseLegacySettings,
  parseStoredState,
  SCHEMA_VERSION,
  STORE_KEYS,
  type PersistedState,
} from "./schema";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

/** The part of the plugin-store `Store` API this adapter uses. */
export interface KeyValueStore {
  entries<T>(): Promise<[key: string, value: T][]>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
}

export interface LoadResult {
  state: PersistedState;
  /** Set when saved data could not be read, so the user knows why defaults appear. */
  warning?: string;
}

export interface SettingsStorage {
  /** Never rejects: when nothing can be read, it resolves with defaults and a warning. */
  load(): Promise<LoadResult>;
  saveSettings(settings: Settings): Promise<void>;
  saveTicket(ticket: Ticket): Promise<void>;
}

/** Returns the v0.1.0 settings JSON from localStorage, or null. */
export function readLegacyLocalStorage(): string | null {
  try {
    return window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage can be disabled in some webview configurations.
    return null;
  }
}

export function createSettingsStorage(
  openStore: () => Promise<KeyValueStore>,
  readLegacy: () => string | null = readLegacyLocalStorage,
): SettingsStorage {
  let opening: Promise<KeyValueStore> | undefined;

  // Opened once and shared. A failed open is forgotten so the next call retries.
  function store(): Promise<KeyValueStore> {
    opening ??= openStore().catch((error: unknown) => {
      opening = undefined;
      throw error;
    });
    return opening;
  }

  async function write(key: string, value: unknown): Promise<void> {
    const kv = await store();
    await kv.set(STORE_KEYS.version, SCHEMA_VERSION);
    await kv.set(key, value);
    await kv.save();
  }

  async function load(): Promise<LoadResult> {
    let entries: Record<string, unknown>;
    try {
      entries = Object.fromEntries(await (await store()).entries());
    } catch (error) {
      return {
        state: { settings: { ...DEFAULT_SETTINGS }, ticket: { ...DEFAULT_TICKET } },
        warning: `Could not read saved settings, so defaults are in use. ${errorText(error)}`,
      };
    }

    if (Object.keys(entries).length === 0) {
      const legacy = parseLegacySettings(readLegacy());
      if (legacy !== null) {
        // Copy forward now so later ticket saves never leave a file without settings.
        await write(STORE_KEYS.settings, legacy).catch(() => undefined);
        return { state: { settings: legacy, ticket: { ...DEFAULT_TICKET } } };
      }
    }

    return { state: parseStoredState(entries) };
  }

  return {
    load,
    saveSettings: (settings) => write(STORE_KEYS.settings, settings),
    saveTicket: (ticket) => write(STORE_KEYS.ticket, ticket),
  };
}

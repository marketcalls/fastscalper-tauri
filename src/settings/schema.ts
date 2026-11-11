/**
 * The on-disk layout of settings.json, and how to read it back safely.
 *
 * The file is meant to be readable and editable by hand:
 *
 *   {
 *     "schemaVersion": 1,
 *     "settings": { "apiKey": "...", "hostUrl": "http://127.0.0.1:5000", "exchange": "NSE",
 *                   "product": "MIS", "voiceAlerts": false, "alwaysOnTop": false },
 *     "ticket": { "symbol": "SBIN", "quantity": 1 }
 *   }
 *
 * Reading never throws. Each field is checked on its own and replaced by its
 * default when missing or invalid, so one bad value does not cost the user
 * the rest of their settings.
 */
import { EXCHANGES, PRODUCTS } from "../api/types";
import {
  DEFAULT_TICKET,
  normaliseSymbolInput,
  parseQuantity,
  type Ticket,
} from "../trading/ticket";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

/**
 * Bump this when the layout changes, and teach `parseStoredState` to upgrade
 * the older layout. Files written by a newer version are read best effort:
 * fields this version does not know are ignored.
 */
export const SCHEMA_VERSION = 1;

export const STORE_KEYS = {
  version: "schemaVersion",
  settings: "settings",
  ticket: "ticket",
} as const;

export interface PersistedState {
  settings: Settings;
  ticket: Ticket;
}

/** Reads the top-level entries of settings.json. */
export function parseStoredState(entries: Readonly<Record<string, unknown>>): PersistedState {
  return {
    settings: readSettings(entries[STORE_KEYS.settings]),
    ticket: readTicket(entries[STORE_KEYS.ticket]),
  };
}

/**
 * FastScalper v0.1.0 kept a flat settings object in localStorage under this
 * key. Its field names match `Settings`, so it reads like a version 0 file.
 */
export const LEGACY_STORAGE_KEY = "fastscalperSettings";

/** Reads v0.1.0 settings JSON. Returns null when there is nothing usable. */
export function parseLegacySettings(json: string | null): Settings | null {
  if (json === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return isRecord(parsed) ? readSettings(parsed) : null;
}

function readSettings(value: unknown): Settings {
  const raw = isRecord(value) ? value : {};
  return {
    apiKey: readString(raw.apiKey)?.trim() ?? DEFAULT_SETTINGS.apiKey,
    hostUrl: readNonEmptyString(raw.hostUrl) ?? DEFAULT_SETTINGS.hostUrl,
    exchange: readOption(raw.exchange, EXCHANGES) ?? DEFAULT_SETTINGS.exchange,
    product: readOption(raw.product, PRODUCTS) ?? DEFAULT_SETTINGS.product,
    voiceAlerts: readBoolean(raw.voiceAlerts) ?? DEFAULT_SETTINGS.voiceAlerts,
    alwaysOnTop: readBoolean(raw.alwaysOnTop) ?? DEFAULT_SETTINGS.alwaysOnTop,
  };
}

function readTicket(value: unknown): Ticket {
  const raw = isRecord(value) ? value : {};
  const quantity =
    typeof raw.quantity === "number" || typeof raw.quantity === "string"
      ? parseQuantity(String(raw.quantity))
      : null;
  return {
    symbol: normaliseSymbolInput(readString(raw.symbol) ?? DEFAULT_TICKET.symbol),
    quantity: quantity ?? DEFAULT_TICKET.quantity,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNonEmptyString(value: unknown): string | undefined {
  const text = readString(value)?.trim();
  return text === "" ? undefined : text;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/** Matches case-insensitively, since a hand-edited "nse" clearly means NSE. */
function readOption<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  if (typeof value !== "string") return undefined;
  const wanted = value.trim().toUpperCase();
  return options.find((option) => option === wanted);
}

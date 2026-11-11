import type { Connection, Exchange, Product } from "../api/types";

/** User preferences edited in the Settings dialog. */
export interface Settings {
  apiKey: string;
  hostUrl: string;
  exchange: Exchange;
  product: Product;
  voiceAlerts: boolean;
  alwaysOnTop: boolean;
}

/** OpenAlgo's default address when it runs on the same machine. */
export const DEFAULT_HOST_URL = "http://127.0.0.1:5000";

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  apiKey: "",
  hostUrl: DEFAULT_HOST_URL,
  exchange: "NSE",
  product: "MIS",
  voiceAlerts: false,
  alwaysOnTop: false,
};

export function hasApiKey(settings: Pick<Settings, "apiKey">): boolean {
  return settings.apiKey.trim() !== "";
}

export function connectionOf(settings: Pick<Settings, "apiKey" | "hostUrl">): Connection {
  return { hostUrl: settings.hostUrl, apiKey: settings.apiKey };
}

/** Trims the free-text fields so stray whitespace from a paste is never saved. */
export function normaliseSettings(settings: Settings): Settings {
  return { ...settings, apiKey: settings.apiKey.trim(), hostUrl: settings.hostUrl.trim() };
}

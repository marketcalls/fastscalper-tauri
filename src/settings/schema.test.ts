import { describe, expect, it } from "vitest";
import { DEFAULT_TICKET } from "../trading/ticket";
import { parseLegacySettings, parseStoredState } from "./schema";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

const savedSettings: Settings = {
  apiKey: "key-1",
  hostUrl: "https://algo.example.com",
  exchange: "MCX",
  product: "NRML",
  voiceAlerts: true,
  alwaysOnTop: true,
};

describe("parseStoredState", () => {
  it("uses defaults for an empty file", () => {
    expect(parseStoredState({})).toEqual({ settings: DEFAULT_SETTINGS, ticket: DEFAULT_TICKET });
  });

  it("reads back a version 1 file", () => {
    const state = parseStoredState({
      schemaVersion: 1,
      settings: savedSettings,
      ticket: { symbol: "CRUDEOIL", quantity: 2 },
    });
    expect(state).toEqual({ settings: savedSettings, ticket: { symbol: "CRUDEOIL", quantity: 2 } });
  });

  it("replaces only the fields that are invalid", () => {
    const state = parseStoredState({
      schemaVersion: 1,
      settings: {
        ...savedSettings,
        exchange: "LSE",
        product: 7,
        voiceAlerts: "yes",
        hostUrl: "   ",
      },
      ticket: { symbol: 42, quantity: -3 },
    });
    expect(state.settings).toEqual({
      ...savedSettings,
      exchange: DEFAULT_SETTINGS.exchange,
      product: DEFAULT_SETTINGS.product,
      voiceAlerts: DEFAULT_SETTINGS.voiceAlerts,
      hostUrl: DEFAULT_SETTINGS.hostUrl,
    });
    expect(state.ticket).toEqual(DEFAULT_TICKET);
  });

  it("accepts the obvious meaning of hand-edited values", () => {
    const state = parseStoredState({
      settings: { ...savedSettings, exchange: " nfo ", apiKey: " key-1 \n" },
      ticket: { symbol: "sbin", quantity: "50" },
    });
    expect(state.settings.exchange).toBe("NFO");
    expect(state.settings.apiKey).toBe("key-1");
    expect(state.ticket).toEqual({ symbol: "SBIN", quantity: 50 });
  });

  it.each([null, "settings", 5, ["apiKey"]])("survives a settings entry of %j", (value) => {
    expect(parseStoredState({ settings: value, ticket: value })).toEqual({
      settings: DEFAULT_SETTINGS,
      ticket: DEFAULT_TICKET,
    });
  });

  it("reads what it knows from a file written by a newer version", () => {
    const state = parseStoredState({
      schemaVersion: 7,
      settings: { ...savedSettings, theme: "solarized" },
      layout: "compact",
    });
    expect(state.settings).toEqual(savedSettings);
  });
});

describe("parseLegacySettings (FastScalper v0.1.0 localStorage)", () => {
  it("imports the v0.1.0 settings and fills in the new fields", () => {
    const legacy = JSON.stringify({
      apiKey: "old-key",
      exchange: "BSE",
      product: "CNC",
      voiceAlerts: true,
      hostUrl: "http://192.168.1.5:5000",
    });
    expect(parseLegacySettings(legacy)).toEqual({
      apiKey: "old-key",
      exchange: "BSE",
      product: "CNC",
      voiceAlerts: true,
      hostUrl: "http://192.168.1.5:5000",
      alwaysOnTop: false,
    });
  });

  it.each([null, "", "{not json", "[]", "42"])("ignores %j", (raw) => {
    expect(parseLegacySettings(raw)).toBeNull();
  });
});

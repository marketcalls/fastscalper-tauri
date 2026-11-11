import { describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../test/memoryStore";
import { DEFAULT_TICKET } from "../trading/ticket";
import { LEGACY_STORAGE_KEY } from "./schema";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { createSettingsStorage, readLegacyLocalStorage } from "./storage";

const settings: Settings = { ...DEFAULT_SETTINGS, apiKey: "key-1", exchange: "NFO" };

function storageOver(store: MemoryStore, legacy: string | null = null) {
  return createSettingsStorage(
    () => Promise.resolve(store),
    () => legacy,
  );
}

describe("SettingsStorage.load", () => {
  it("reads settings and ticket from the store", async () => {
    const store = new MemoryStore({
      schemaVersion: 1,
      settings,
      ticket: { symbol: "SBIN", quantity: 4 },
    });

    await expect(storageOver(store).load()).resolves.toEqual({
      state: { settings, ticket: { symbol: "SBIN", quantity: 4 } },
    });
  });

  it("starts from defaults on first run", async () => {
    await expect(storageOver(new MemoryStore()).load()).resolves.toEqual({
      state: { settings: DEFAULT_SETTINGS, ticket: DEFAULT_TICKET },
    });
  });

  it("imports v0.1.0 settings when the store is empty, and saves them to the store", async () => {
    const store = new MemoryStore();
    const legacy = JSON.stringify({ apiKey: "old-key", exchange: "BSE" });

    const { state } = await storageOver(store, legacy).load();

    expect(state.settings).toMatchObject({ apiKey: "old-key", exchange: "BSE" });
    expect(store.saved).toEqual({ schemaVersion: 1, settings: state.settings });
  });

  it("prefers the store over v0.1.0 settings", async () => {
    const store = new MemoryStore({ schemaVersion: 1, settings });
    const legacy = JSON.stringify({ apiKey: "old-key" });

    const { state } = await storageOver(store, legacy).load();

    expect(state.settings.apiKey).toBe("key-1");
  });

  it("falls back to defaults with a warning when the store cannot be opened, then retries", async () => {
    const openStore = vi
      .fn<() => Promise<MemoryStore>>()
      .mockRejectedValueOnce(new Error("permission denied"))
      .mockResolvedValue(new MemoryStore());
    const storage = createSettingsStorage(openStore, () => null);

    const result = await storage.load();
    expect(result.state).toEqual({ settings: DEFAULT_SETTINGS, ticket: DEFAULT_TICKET });
    expect(result.warning).toContain("permission denied");

    await storage.saveSettings(settings);
    expect(openStore).toHaveBeenCalledTimes(2);
  });
});

describe("SettingsStorage saves", () => {
  it("writes settings with the schema version", async () => {
    const store = new MemoryStore();
    await storageOver(store).saveSettings(settings);
    expect(store.saved).toEqual({ schemaVersion: 1, settings });
  });

  it("writes the ticket alongside existing settings", async () => {
    const store = new MemoryStore({ schemaVersion: 1, settings });
    await storageOver(store).saveTicket({ symbol: "SBIN", quantity: 9 });
    expect(store.saved).toEqual({
      schemaVersion: 1,
      settings,
      ticket: { symbol: "SBIN", quantity: 9 },
    });
  });

  it("rejects when the file cannot be written", async () => {
    const store = new MemoryStore();
    store.saveError = new Error("disk full");
    await expect(storageOver(store).saveSettings(settings)).rejects.toThrow("disk full");
  });
});

describe("readLegacyLocalStorage", () => {
  it("reads the v0.1.0 key", () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, '{"apiKey":"x"}');
    expect(readLegacyLocalStorage()).toBe('{"apiKey":"x"}');
  });

  it("returns null when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readLegacyLocalStorage()).toBeNull();
  });
});

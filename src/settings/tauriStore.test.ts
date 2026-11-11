import { describe, expect, it } from "vitest";
import { callsTo, installFakeBackend } from "../test/fakeBackend";
import { openSettingsStore } from "./tauriStore";

describe("openSettingsStore", () => {
  it("opens settings.json in the app config directory with explicit saves", async () => {
    const calls = installFakeBackend({
      "plugin:path|resolve_directory": () => "C:\\Users\\me\\AppData\\Roaming\\com.fastscalper.app",
      "plugin:path|join": (args) => (args as { paths: string[] }).paths.join("\\"),
      "plugin:store|load": () => 7,
    });

    await openSettingsStore();

    expect(callsTo(calls, "plugin:store|load")).toEqual([
      {
        cmd: "plugin:store|load",
        args: {
          path: "C:\\Users\\me\\AppData\\Roaming\\com.fastscalper.app\\settings.json",
          options: { autoSave: false, defaults: {} },
        },
      },
    ]);
  });
});

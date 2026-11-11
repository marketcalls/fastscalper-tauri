import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "../../settings/settings";
import { callsTo, deferred, installFakeBackend, rejectWith } from "../../test/fakeBackend";
import { SettingsDialog } from "./SettingsDialog";
import { SETTINGS_WINDOW_SIZE } from "./settingsWindowSize";

// The window itself is mocked at its module boundary; lib/windowSize.test.ts covers the real thing.
const windowSize = vi.hoisted(() => ({ grow: vi.fn(), release: vi.fn() }));
vi.mock("../../lib/windowSize", () => ({
  growWindowUntilReleased: (size: unknown) => {
    windowSize.grow(size);
    return windowSize.release;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const saved: Settings = {
  apiKey: "key-1",
  hostUrl: "http://10.0.0.5:5000",
  exchange: "NFO",
  product: "NRML",
  voiceAlerts: true,
  alwaysOnTop: false,
};

function renderDialog(initial: Settings = saved) {
  const onSave = vi.fn<(settings: Settings) => void>();
  const onCancel = vi.fn<() => void>();
  const user = userEvent.setup();
  const { unmount } = render(
    <SettingsDialog initial={initial} onSave={onSave} onCancel={onCancel} />,
  );
  const dialog = screen.getByRole("dialog", { name: "Settings" });
  return { user, onSave, onCancel, dialog, unmount };
}

const apiKeyInput = () => screen.getByLabelText("API key");
const hostInput = () => screen.getByLabelText("Host URL");

describe("SettingsDialog", () => {
  it("opens as a modal with every field labelled and filled in, focusing the API key", () => {
    const { dialog } = renderDialog();

    expect(dialog).toHaveAttribute("open");
    expect(apiKeyInput()).toHaveValue("key-1");
    expect(apiKeyInput()).toHaveFocus();
    expect(hostInput()).toHaveValue("http://10.0.0.5:5000");
    expect(screen.getByLabelText("Exchange")).toHaveValue("NFO");
    expect(screen.getByLabelText("Product")).toHaveValue("NRML");
    expect(screen.getByLabelText("Voice alerts")).toBeChecked();
    expect(screen.getByLabelText("Always on top")).not.toBeChecked();
  });

  it("grows the window to fit while open and gives the size back when closed", () => {
    const { unmount } = renderDialog();
    expect(windowSize.grow).toHaveBeenCalledExactlyOnceWith(SETTINGS_WINDOW_SIZE);
    expect(windowSize.release).not.toHaveBeenCalled();

    unmount();

    expect(windowSize.release).toHaveBeenCalledOnce();
  });

  it("saves the edited values, trimmed", async () => {
    const { user, onSave } = renderDialog();

    await user.clear(apiKeyInput());
    await user.type(apiKeyInput(), "  new-key  ");
    await user.clear(hostInput());
    await user.type(hostInput(), "https://algo.example.com ");
    await user.selectOptions(screen.getByLabelText("Exchange"), "MCX");
    await user.selectOptions(screen.getByLabelText("Product"), "MIS");
    await user.click(screen.getByLabelText("Voice alerts"));
    await user.click(screen.getByLabelText("Always on top"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      apiKey: "new-key",
      hostUrl: "https://algo.example.com",
      exchange: "MCX",
      product: "MIS",
      voiceAlerts: false,
      alwaysOnTop: true,
    });
  });

  it("discards edits on Cancel", async () => {
    const { user, onSave, onCancel } = renderDialog();

    await user.type(apiKeyInput(), "-changed");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels on Escape", async () => {
    const { user, onSave, onCancel } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows what to fix instead of saving invalid values, and focuses the first problem", async () => {
    const { user, onSave } = renderDialog();

    await user.clear(apiKeyInput());
    await user.clear(hostInput());
    await user.type(hostInput(), "127.0.0.1:5000");
    expect(screen.queryByText("Enter your OpenAlgo API key.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(apiKeyInput()).toHaveAccessibleDescription("Enter your OpenAlgo API key.");
    expect(apiKeyInput()).toBeInvalid();
    expect(hostInput()).toHaveAccessibleDescription(
      "Enter a full URL, for example http://127.0.0.1:5000.",
    );
    expect(apiKeyInput()).toHaveFocus();

    // Errors then follow the edits.
    await user.type(apiKeyInput(), "key-2");
    expect(apiKeyInput()).toBeValid();
    expect(apiKeyInput()).not.toHaveAccessibleDescription();
  });

  it("shows and hides the API key", async () => {
    const { user } = renderDialog();
    const toggle = screen.getByRole("button", { name: "Show API key" });

    expect(apiKeyInput()).toHaveAttribute("type", "password");
    await user.click(toggle);
    expect(apiKeyInput()).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(apiKeyInput()).toHaveAttribute("type", "password");
  });

  it("resets everything except the API key to defaults", async () => {
    const { user, onSave } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledExactlyOnceWith({ ...DEFAULT_SETTINGS, apiKey: "key-1" });
  });

  describe("Test connection", () => {
    it("tests the values in the form and shows the broker", async () => {
      const calls = installFakeBackend({
        test_connection: () => ({ broker: "zerodha", message: "pong" }),
      });
      const { user, dialog } = renderDialog();

      await user.clear(hostInput());
      await user.type(hostInput(), "http://192.168.1.9:5000");
      await user.click(screen.getByRole("button", { name: "Test connection" }));

      expect(await within(dialog).findByRole("status")).toHaveTextContent(
        "Connected. Broker: zerodha.",
      );
      expect(callsTo(calls, "test_connection")).toEqual([
        {
          cmd: "test_connection",
          args: { connection: { hostUrl: "http://192.168.1.9:5000", apiKey: "key-1" } },
        },
      ]);
    });

    it("shows why the connection failed", async () => {
      installFakeBackend({
        test_connection: () => rejectWith({ kind: "api", message: "Invalid apikey", status: 403 }),
      });
      const { user, dialog } = renderDialog();

      await user.click(screen.getByRole("button", { name: "Test connection" }));

      expect(await within(dialog).findByRole("status")).toHaveTextContent(
        "OpenAlgo error (HTTP 403): Invalid apikey.",
      );
    });

    it("shows that a test is running and blocks a second one", async () => {
      const reply = deferred<{ broker: string; message: string }>();
      const calls = installFakeBackend({ test_connection: () => reply.promise });
      const { user, dialog } = renderDialog();

      await user.click(screen.getByRole("button", { name: "Test connection" }));
      expect(screen.getByRole("button", { name: "Testing connection" })).toBeDisabled();

      reply.resolve({ broker: "", message: "pong" });
      expect(await within(dialog).findByText("Connected.")).toBeInTheDocument();
      expect(callsTo(calls, "test_connection")).toHaveLength(1);
    });

    it("does not test without an API key", async () => {
      const calls = installFakeBackend();
      const { user } = renderDialog({ ...saved, apiKey: "" });

      await user.click(screen.getByRole("button", { name: "Test connection" }));

      expect(apiKeyInput()).toHaveAccessibleDescription("Enter your OpenAlgo API key.");
      expect(calls).toEqual([]);
    });

    it("clears an old result when the host changes", async () => {
      installFakeBackend({ test_connection: () => ({ broker: "zerodha", message: "pong" }) });
      const { user, dialog } = renderDialog();

      await user.click(screen.getByRole("button", { name: "Test connection" }));
      const result = await within(dialog).findByRole("status");
      expect(result).toHaveTextContent("Connected");

      await user.type(hostInput(), "1");
      expect(result).toBeEmptyDOMElement();
    });
  });
});

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import type { OrderResult } from "./api/types";
import { SETTINGS_WINDOW_SIZE } from "./components/SettingsDialog/settingsWindowSize";
import { DEFAULT_SETTINGS, type Settings } from "./settings/settings";
import { createSettingsStorage } from "./settings/storage";
import { TICKET_SAVE_DELAY_MS } from "./trading/useTicket";
import {
  callsTo,
  deferred,
  installFakeBackend,
  rejectWith,
  type IpcCall,
} from "./test/fakeBackend";
import { installFakeSpeech } from "./test/fakeSpeech";
import { MemoryStore } from "./test/memoryStore";

const configured: Settings = { ...DEFAULT_SETTINGS, apiKey: "key-1" };

interface RenderOptions {
  settings?: Settings;
  ticket?: { symbol: string; quantity: number };
  handlers?: Parameters<typeof installFakeBackend>[0];
  openStore?: () => Promise<MemoryStore>;
}

async function renderApp(options: RenderOptions = {}) {
  const store = new MemoryStore({
    schemaVersion: 1,
    settings: options.settings ?? configured,
    ticket: options.ticket ?? { symbol: "SBIN", quantity: 10 },
  });
  const calls = installFakeBackend(options.handlers);
  const user = userEvent.setup();
  const openStore = options.openStore ?? (() => Promise.resolve(store));
  // Async act lets React retry the render that suspended while settings load.
  await act(async () => {
    render(<App storage={createSettingsStorage(openStore, () => null)} />);
  });
  await screen.findByRole("region", { name: "Order pad" });
  return { user, calls, store };
}

const tradeButton = (id: string) => screen.getByRole("button", { name: id });
const statusLine = () => screen.getByRole("status");
const orders = (calls: IpcCall[]) => callsTo(calls, "place_order");
const placed: OrderResult = { status: "success", orderId: "250101000123" };

describe("placing orders", () => {
  it.each([
    { id: "LE", action: "BUY", quantity: 10 },
    { id: "LX", action: "SELL", quantity: 0 },
    { id: "SE", action: "SELL", quantity: 10 },
    { id: "SX", action: "BUY", quantity: 0 },
  ])("$id invokes place_order with $action $quantity", async ({ id, action, quantity }) => {
    const { user, calls } = await renderApp({ handlers: { place_order: () => placed } });

    await user.click(tradeButton(id));

    expect(orders(calls)).toEqual([
      {
        cmd: "place_order",
        args: {
          connection: { hostUrl: "http://127.0.0.1:5000", apiKey: "key-1" },
          order: { symbol: "SBIN", exchange: "NSE", product: "MIS", action, quantity },
        },
      },
    ]);
  });

  it("sends what is typed in the symbol and quantity inputs", async () => {
    const { user, calls } = await renderApp({ handlers: { place_order: () => placed } });

    await user.clear(screen.getByLabelText("Symbol"));
    await user.type(screen.getByLabelText("Symbol"), "bhel");
    await user.clear(screen.getByLabelText("Qty"));
    await user.type(screen.getByLabelText("Qty"), "2x5");
    await user.click(tradeButton("SE"));

    expect(orders(calls)[0]?.args).toMatchObject({
      order: { symbol: "BHEL", action: "SELL", quantity: 25 },
    });
  });

  it("shows the order ID when the order is placed", async () => {
    const { user } = await renderApp({ handlers: { place_order: () => placed } });

    await user.click(tradeButton("LE"));

    await waitFor(() => {
      expect(statusLine()).toHaveTextContent("LE placed. Order ID 250101000123");
    });
  });

  it("shows the server message when OpenAlgo succeeds without an order", async () => {
    const { user } = await renderApp({
      handlers: { place_order: () => ({ status: "success", message: "No open position" }) },
    });

    await user.click(tradeButton("LX"));

    await waitFor(() => {
      expect(statusLine()).toHaveTextContent("LX: No open position.");
    });
  });

  it.each([
    {
      kind: "validation",
      error: { kind: "validation", message: "Symbol is missing" },
      shows: "LE failed. Symbol is missing.",
      tooltip: "LE failed. Symbol is missing.",
    },
    {
      kind: "network",
      error: { kind: "network", message: "Connection refused" },
      shows: "LE: network error. Check the order book before retrying.",
      tooltip: "Connection refused. Check the host URL and that OpenAlgo is running.",
    },
    {
      kind: "api",
      error: { kind: "api", message: "Insufficient funds", status: 400 },
      shows: "LE failed. OpenAlgo error (HTTP 400): Insufficient funds.",
      tooltip: "LE failed. OpenAlgo error (HTTP 400): Insufficient funds.",
    },
    {
      kind: "decode",
      error: { kind: "decode", message: "<html>", status: 200 },
      shows:
        "LE failed. Unexpected reply from http://127.0.0.1:5000 (HTTP 200). Check that the host URL points to OpenAlgo.",
      tooltip: "<html>",
    },
  ])("explains a $kind error on the status line", async ({ error, shows, tooltip }) => {
    const { user, calls } = await renderApp({ handlers: { place_order: () => rejectWith(error) } });

    await user.click(tradeButton("LE"));

    await waitFor(() => {
      expect(statusLine()).toHaveTextContent(shows);
    });
    // The line is cut short when long; the tooltip carries the time and everything else.
    expect(statusLine().title).toMatch(/^\d\d:\d\d:\d\d /);
    expect(statusLine().title).toContain(tooltip);
    // A failed order is reported, never retried automatically.
    expect(orders(calls)).toHaveLength(1);
  });

  it("checks the quantity locally before an entry is sent", async () => {
    const { user, calls } = await renderApp();

    await user.clear(screen.getByLabelText("Qty"));
    await user.click(tradeButton("LE"));

    expect(statusLine()).toHaveTextContent("LE: Enter a whole-number quantity of 1 or more.");
    expect(orders(calls)).toEqual([]);
  });

  it("still sends an exit when the quantity input is empty", async () => {
    const { user, calls } = await renderApp({ handlers: { place_order: () => placed } });

    await user.clear(screen.getByLabelText("Qty"));
    await user.click(tradeButton("SX"));

    expect(orders(calls)[0]?.args).toMatchObject({ order: { action: "BUY", quantity: 0 } });
  });
});

describe("orders in flight", () => {
  it("ignores a second press of the same button until the first order is answered", async () => {
    const reply = deferred<OrderResult>();
    const { user, calls } = await renderApp({ handlers: { place_order: () => reply.promise } });

    await user.click(tradeButton("LE"));
    expect(tradeButton("LE")).toHaveAttribute("aria-busy", "true");
    expect(statusLine()).toHaveTextContent("LE: buying 10 SBIN on NSE (MIS).");

    await user.click(tradeButton("LE"));
    expect(orders(calls)).toHaveLength(1);

    reply.resolve(placed);
    await waitFor(() => {
      expect(tradeButton("LE")).not.toHaveAttribute("aria-busy");
    });
    await user.click(tradeButton("LE"));
    expect(orders(calls)).toHaveLength(2);
  });

  it.each(["LX", "SX"])("never holds %s back behind a pending entry", async (exit) => {
    const entryReply = deferred<OrderResult>();
    const { user, calls } = await renderApp({
      handlers: {
        place_order: (args) =>
          (args as { order: { quantity: number } }).order.quantity > 0
            ? entryReply.promise
            : { status: "success", orderId: "exit-1" },
      },
    });

    await user.click(tradeButton("LE"));
    await user.click(tradeButton(exit));

    expect(orders(calls)).toHaveLength(2);
    await waitFor(() => {
      expect(statusLine()).toHaveTextContent(`${exit} placed. Order ID exit-1`);
    });
    expect(tradeButton("LE")).toHaveAttribute("aria-busy", "true");
    entryReply.resolve(placed);
  });
});

describe("first run without an API key", () => {
  it("opens Settings straight away", async () => {
    await renderApp({ settings: DEFAULT_SETTINGS });

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("API key")).toHaveFocus();
  });

  it("keeps the order buttons disabled and says why until a key is saved", async () => {
    const { user, calls } = await renderApp({
      settings: DEFAULT_SETTINGS,
      handlers: { place_order: () => placed },
    });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    for (const id of ["LE", "LX", "SE", "SX"]) expect(tradeButton(id)).toBeDisabled();
    await user.click(tradeButton("LE"));
    expect(orders(calls)).toEqual([]);
    expect(statusLine()).toHaveTextContent("Add your OpenAlgo API key in Settings to trade.");

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.type(screen.getByLabelText("API key"), "key-9");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(tradeButton("LE")).toBeEnabled();
    await user.click(tradeButton("LE"));
    expect(orders(calls)[0]?.args).toMatchObject({ connection: { apiKey: "key-9" } });
  });
});

describe("settings", () => {
  it("applies, remembers and routes orders with saved settings, returning focus to the gear", async () => {
    const { user, calls, store } = await renderApp({ handlers: { place_order: () => placed } });
    const gear = screen.getByRole("button", { name: "Settings" });

    await user.click(gear);
    await user.selectOptions(screen.getByLabelText("Exchange"), "NFO");
    await user.selectOptions(screen.getByLabelText("Product"), "NRML");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(gear).toHaveFocus();
    expect(statusLine()).toHaveTextContent("Ready: NFO NRML");
    await waitFor(() => {
      expect(store.saved.settings).toMatchObject({ exchange: "NFO", product: "NRML" });
    });

    await user.click(tradeButton("LE"));
    expect(orders(calls)[0]?.args).toMatchObject({
      order: { exchange: "NFO", product: "NRML" },
    });
  });

  it("keeps the new settings in use and warns when they cannot be saved", async () => {
    const { user, calls, store } = await renderApp({ handlers: { place_order: () => placed } });
    store.saveError = new Error("disk full");

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.selectOptions(screen.getByLabelText("Exchange"), "BSE");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(statusLine()).toHaveTextContent("Settings are in use but could not be saved.");
    });
    expect(statusLine().title).toContain("disk full");
    await user.click(tradeButton("LE"));
    expect(orders(calls)[0]?.args).toMatchObject({ order: { exchange: "BSE" } });
  });

  it("warns and starts with defaults when saved settings cannot be read", async () => {
    const { user } = await renderApp({
      openStore: () => Promise.reject(new Error("access denied")),
    });

    // Defaults have no API key, so Settings opens first; the warning waits behind it.
    expect(screen.getByLabelText("API key")).toHaveValue("");
    await user.keyboard("{Escape}");
    expect(statusLine()).toHaveTextContent("Could not read saved settings");
  });
});

describe("voice alerts", () => {
  it.each([
    ["LE", "Buy Order"],
    ["LX", "Buy Exit"],
    ["SE", "Short Order"],
    ["SX", "Short Exit"],
  ])("%s says %j when enabled", async (id, phrase) => {
    const { spoken } = installFakeSpeech();
    const { user } = await renderApp({
      settings: { ...configured, voiceAlerts: true },
      handlers: { place_order: () => placed },
    });

    await user.click(tradeButton(id));

    expect(spoken).toEqual([phrase]);
  });

  it("stays silent when disabled", async () => {
    const { spoken } = installFakeSpeech();
    const { user } = await renderApp({ handlers: { place_order: () => placed } });

    await user.click(tradeButton("LE"));

    expect(spoken).toEqual([]);
  });

  it("stays silent when the order is not sent", async () => {
    const { spoken } = installFakeSpeech();
    const { user } = await renderApp({ settings: { ...configured, voiceAlerts: true } });

    await user.clear(screen.getByLabelText("Symbol"));
    await user.click(tradeButton("LE"));

    expect(spoken).toEqual([]);
  });
});

describe("always on top", () => {
  const alwaysOnTopCalls = (calls: IpcCall[]) =>
    callsTo(calls, "plugin:window|set_always_on_top").map((call) => call.args);

  it("applies the saved setting on start", async () => {
    const { calls } = await renderApp({ settings: { ...configured, alwaysOnTop: true } });

    await waitFor(() => {
      expect(alwaysOnTopCalls(calls)).toContainEqual({ label: "main", value: true });
    });
  });

  it("applies a change made in Settings", async () => {
    const { user, calls } = await renderApp();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByLabelText("Always on top"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(alwaysOnTopCalls(calls).at(-1)).toEqual({ label: "main", value: true });
    });
  });

  it("warns when the window refuses", async () => {
    await renderApp({
      settings: { ...configured, alwaysOnTop: true },
      handlers: { "plugin:window|set_always_on_top": () => rejectWith("not allowed") },
    });

    await waitFor(() => {
      expect(statusLine()).toHaveTextContent("Could not change the always-on-top setting.");
    });
  });
});

describe("the ticket", () => {
  it("starts from the last symbol and quantity", async () => {
    await renderApp({ ticket: { symbol: "TATASTEEL", quantity: 150 } });

    expect(screen.getByLabelText("Symbol")).toHaveValue("TATASTEEL");
    expect(screen.getByLabelText("Qty")).toHaveValue("150");
  });

  it("is remembered after a pause in typing", async () => {
    const { user, store } = await renderApp();

    await user.clear(screen.getByLabelText("Symbol"));
    await user.type(screen.getByLabelText("Symbol"), "infy");
    await user.type(screen.getByLabelText("Qty"), "0");

    await waitFor(
      () => {
        expect(store.saved.ticket).toEqual({ symbol: "INFY", quantity: 100 });
      },
      { timeout: TICKET_SAVE_DELAY_MS * 4 },
    );
  });
});

describe("layout", () => {
  it("shows the four buttons in v0.1.0 order, labelled by code with the name as a tooltip", async () => {
    await renderApp();

    const long = screen.getByRole("group", { name: "Long" });
    const short = screen.getByRole("group", { name: "Short" });
    const labelAndTooltip = (button: HTMLElement) => `${button.textContent}: ${button.title}`;
    expect(within(long).getAllByRole("button").map(labelAndTooltip)).toEqual([
      "LE: Long entry",
      "LX: Long exit",
    ]);
    expect(within(short).getAllByRole("button").map(labelAndTooltip)).toEqual([
      "SE: Short entry",
      "SX: Short exit",
    ]);
  });
});

describe("window size", () => {
  const resizes = (calls: IpcCall[]): unknown[] =>
    callsTo(calls, "plugin:window|set_size").map(
      (call) => JSON.parse(JSON.stringify(call.args)) as unknown,
    );

  it("grows the window for Settings and restores the compact size afterwards", async () => {
    // A 320 by 125 window on a 2x display reports its size in physical pixels.
    const { user, calls } = await renderApp({
      handlers: {
        "plugin:window|inner_size": () => ({ width: 640, height: 250 }),
        "plugin:window|scale_factor": () => 2,
      },
    });

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() => {
      expect(resizes(calls)).toEqual([{ label: "main", value: { Logical: SETTINGS_WINDOW_SIZE } }]);
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(resizes(calls).at(-1)).toEqual({
        label: "main",
        value: { Logical: { width: 320, height: 125 } },
      });
    });
  });

  it("still opens Settings when the window cannot be resized", async () => {
    const { user } = await renderApp({
      handlers: { "plugin:window|set_size": () => rejectWith("not allowed") },
    });

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "../settings/settings";
import { prepareOrder } from "./prepareOrder";

const settings: Settings = { ...DEFAULT_SETTINGS, apiKey: "key-1" };

describe("prepareOrder", () => {
  it("builds the order from the inputs and settings", () => {
    expect(prepareOrder("SE", { symbol: "sbin", quantity: "3" }, settings)).toEqual({
      ok: true,
      order: { symbol: "SBIN", exchange: "NSE", product: "MIS", action: "SELL", quantity: 3 },
    });
  });

  it("refuses to send anything without an API key", () => {
    const result = prepareOrder("LE", { symbol: "SBIN", quantity: "1" }, DEFAULT_SETTINGS);
    expect(result).toEqual({ ok: false, problem: "Add your OpenAlgo API key in Settings first." });
  });

  it("refuses a host URL that is not a URL", () => {
    const result = prepareOrder(
      "LE",
      { symbol: "SBIN", quantity: "1" },
      { ...settings, hostUrl: "localhost" },
    );
    expect(result.ok).toBe(false);
  });

  it("asks for a symbol", () => {
    expect(prepareOrder("LX", { symbol: "  ", quantity: "1" }, settings)).toEqual({
      ok: false,
      problem: "Enter a symbol.",
    });
  });

  it.each(["LE", "SE"] as const)("%s needs a whole-number quantity", (id) => {
    expect(prepareOrder(id, { symbol: "SBIN", quantity: "0" }, settings)).toEqual({
      ok: false,
      problem: "Enter a whole-number quantity of 1 or more.",
    });
  });

  it.each(["LX", "SX"] as const)("%s ignores the quantity input and closes with 0", (id) => {
    const result = prepareOrder(id, { symbol: "SBIN", quantity: "" }, settings);
    expect(result).toMatchObject({ ok: true, order: { quantity: 0 } });
  });
});

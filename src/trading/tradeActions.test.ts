import { describe, expect, it } from "vitest";
import { buildOrder, TRADE_ACTION_IDS, TRADE_ACTIONS } from "./tradeActions";

const ticket = { symbol: "BHEL", quantity: 25 };
const route = { exchange: "NFO", product: "NRML" } as const;

describe("buildOrder", () => {
  it.each([
    { id: "LE", action: "BUY", quantity: 25, phrase: "Buy Order" },
    { id: "LX", action: "SELL", quantity: 0, phrase: "Buy Exit" },
    { id: "SE", action: "SELL", quantity: 25, phrase: "Short Order" },
    { id: "SX", action: "BUY", quantity: 0, phrase: "Short Exit" },
  ] as const)("$id sends $action with quantity $quantity", ({ id, action, quantity, phrase }) => {
    expect(buildOrder(id, ticket, route)).toEqual({
      symbol: "BHEL",
      exchange: "NFO",
      product: "NRML",
      action,
      quantity,
    });
    expect(TRADE_ACTIONS[id].phrase).toBe(phrase);
  });

  it("covers the four buttons in v0.1.0 order", () => {
    expect(TRADE_ACTION_IDS).toEqual(["LE", "LX", "SE", "SX"]);
  });
});

import { describe, expect, it } from "vitest";
import type { Order } from "../api/types";
import {
  orderFailedStatus,
  orderPlacedStatus,
  orderRejectedStatus,
  orderSendingStatus,
} from "./orderFeedback";

describe("order status messages", () => {
  it("describes an entry being sent", () => {
    const order: Order = {
      symbol: "SBIN",
      exchange: "NSE",
      product: "MIS",
      action: "BUY",
      quantity: 5,
    };
    expect(orderSendingStatus("LE", order)).toMatchObject({
      tone: "info",
      text: "LE: buying 5 SBIN on NSE (MIS).",
    });
  });

  it("describes an exit being sent", () => {
    const order: Order = {
      symbol: "SBIN",
      exchange: "NSE",
      product: "MIS",
      action: "BUY",
      quantity: 0,
    };
    expect(orderSendingStatus("SX", order).text).toBe("SX: closing short SBIN on NSE (MIS).");
  });

  it("shows the order ID on success", () => {
    expect(orderPlacedStatus("LE", { status: "success", orderId: "250101" })).toMatchObject({
      tone: "success",
      text: "LE placed. Order ID 250101",
    });
  });

  it("shows the server message when OpenAlgo succeeds without an order", () => {
    expect(
      orderPlacedStatus("LX", { status: "success", message: "No open position found" }),
    ).toMatchObject({ tone: "info", text: "LX: No open position found." });
  });

  it("still confirms a success that carries neither ID nor message", () => {
    expect(orderPlacedStatus("SE", { status: "success" }).text).toBe("SE: order accepted.");
  });

  it("marks local problems and failures as errors", () => {
    expect(orderRejectedStatus("LE", "Enter a symbol.")).toMatchObject({
      tone: "error",
      text: "LE: Enter a symbol.",
    });
    expect(
      orderFailedStatus("LE", { kind: "api", message: "Bad", status: 400 }, "http://h"),
    ).toMatchObject({ tone: "error", text: "LE failed. OpenAlgo error (HTTP 400): Bad." });
  });

  it("leads a network failure with the order book warning, keeping the cause for the tooltip", () => {
    const status = orderFailedStatus("SE", { kind: "network", message: "timed out" }, "http://h");
    expect(status.text).toBe("SE: network error. Check the order book before retrying.");
    expect(status.detail).toContain("timed out.");
  });
});

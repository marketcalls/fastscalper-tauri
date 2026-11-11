import { describe, expect, it } from "vitest";
import { callsTo, installFakeBackend, rejectWith } from "../test/fakeBackend";
import { placeOrder, testConnection, toCommandError } from "./commands";
import type { Connection, Order } from "./types";

const connection: Connection = { hostUrl: "http://127.0.0.1:5000", apiKey: "key-1" };
const order: Order = {
  symbol: "SBIN",
  exchange: "NSE",
  product: "MIS",
  action: "BUY",
  quantity: 5,
};

describe("placeOrder", () => {
  it("invokes place_order with the connection and order", async () => {
    const calls = installFakeBackend({
      place_order: () => ({ status: "success", orderId: "42" }),
    });

    await expect(placeOrder(connection, order)).resolves.toEqual({
      status: "success",
      orderId: "42",
    });
    expect(callsTo(calls, "place_order")).toEqual([
      { cmd: "place_order", args: { connection, order } },
    ]);
  });

  it("passes a typed backend rejection through unchanged", async () => {
    const error = { kind: "api", message: "Invalid symbol", status: 400 };
    installFakeBackend({ place_order: () => rejectWith(error) });

    await expect(placeOrder(connection, order)).rejects.toEqual(error);
  });

  it("turns an untyped IPC rejection into a validation error", async () => {
    installFakeBackend({ place_order: () => rejectWith("invalid args for place_order") });

    await expect(placeOrder(connection, order)).rejects.toEqual({
      kind: "validation",
      message: "invalid args for place_order",
    });
  });
});

describe("testConnection", () => {
  it("invokes test_connection with the connection", async () => {
    const calls = installFakeBackend({
      test_connection: () => ({ broker: "zerodha", message: "pong" }),
    });

    await expect(testConnection(connection)).resolves.toEqual({
      broker: "zerodha",
      message: "pong",
    });
    expect(callsTo(calls, "test_connection")).toEqual([
      { cmd: "test_connection", args: { connection } },
    ]);
  });
});

describe("toCommandError", () => {
  it.each([
    { kind: "validation", message: "Symbol is missing" },
    { kind: "network", message: "timed out" },
    { kind: "api", message: "Invalid apikey", status: 403 },
    { kind: "decode", message: "Unexpected reply", status: 200 },
  ])("keeps a $kind error as it is", (error) => {
    expect(toCommandError(error)).toBe(error);
  });

  it("treats a plain string as a validation error, since nothing reached OpenAlgo", () => {
    expect(toCommandError("command place_order not allowed")).toEqual({
      kind: "validation",
      message: "command place_order not allowed",
    });
  });

  it("uses the message of an Error", () => {
    expect(toCommandError(new TypeError("no IPC"))).toEqual({
      kind: "validation",
      message: "no IPC",
    });
  });

  it.each([
    ["an unknown kind", { kind: "timeout", message: "late" }],
    ["a non-numeric status", { kind: "api", message: "bad", status: "400" }],
    ["a missing message", { kind: "api" }],
    ["null", null],
  ])("does not trust an object with %s", (_label, value) => {
    expect(toCommandError(value).kind).toBe("validation");
  });
});

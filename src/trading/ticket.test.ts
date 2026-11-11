import { describe, expect, it } from "vitest";
import {
  normaliseQuantityInput,
  normaliseSymbolInput,
  parseQuantity,
  ticketFromDraft,
} from "./ticket";

describe("parseQuantity", () => {
  it.each([
    ["1", 1],
    ["75", 75],
    [" 10 ", 10],
    ["4294967295", 4294967295],
  ])("accepts %j", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(["", "0", "-1", "1.5", "1e3", "abc", "4294967296"])("rejects %j", (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe("input normalisers", () => {
  it("upper-cases symbols and drops spaces", () => {
    expect(normaliseSymbolInput(" nifty 24 ")).toBe("NIFTY24");
  });

  it("keeps only digits in the quantity", () => {
    expect(normaliseQuantityInput("1a2.5-")).toBe("125");
  });
});

describe("ticketFromDraft", () => {
  it("keeps a valid draft", () => {
    expect(ticketFromDraft({ symbol: "sbin", quantity: "15" })).toEqual({
      symbol: "SBIN",
      quantity: 15,
    });
  });

  it("falls back to quantity 1 when the quantity is not usable", () => {
    expect(ticketFromDraft({ symbol: "SBIN", quantity: "" })).toEqual({
      symbol: "SBIN",
      quantity: 1,
    });
  });
});

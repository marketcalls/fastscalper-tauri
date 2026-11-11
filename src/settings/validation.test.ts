import { describe, expect, it } from "vitest";
import { hasErrors, validateApiKey, validateHostUrl, validateSettings } from "./validation";

describe("validateHostUrl", () => {
  it.each(["http://127.0.0.1:5000", "https://algo.example.com", " http://localhost:5000/ "])(
    "accepts %j",
    (url) => {
      expect(validateHostUrl(url)).toBeNull();
    },
  );

  it.each([
    ["", "Enter the OpenAlgo host URL."],
    ["127.0.0.1:5000", "Enter a full URL, for example http://127.0.0.1:5000."],
    ["localhost:5000", "The host URL must start with http:// or https://."],
    ["ftp://algo.example.com", "The host URL must start with http:// or https://."],
  ])("rejects %j", (url, message) => {
    expect(validateHostUrl(url)).toBe(message);
  });
});

describe("validateApiKey", () => {
  it("requires a key", () => {
    expect(validateApiKey("   ")).toBe("Enter your OpenAlgo API key.");
    expect(validateApiKey("abc")).toBeNull();
  });
});

describe("validateSettings", () => {
  it("reports each invalid field", () => {
    const errors = validateSettings({ apiKey: "", hostUrl: "nope" });
    expect(Object.keys(errors).sort()).toEqual(["apiKey", "hostUrl"]);
    expect(hasErrors(errors)).toBe(true);
  });

  it("returns no errors for valid settings", () => {
    const errors = validateSettings({ apiKey: "k", hostUrl: "http://127.0.0.1:5000" });
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });
});

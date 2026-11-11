import { describe, expect, it } from "vitest";
import { asSentence, describeCommandError } from "./describeError";

const host = "http://10.0.0.5:5000";

describe("describeCommandError", () => {
  it("shows a validation message as it is, as a sentence", () => {
    expect(
      describeCommandError({ kind: "validation", message: "Symbol is missing" }, host),
    ).toEqual({ text: "Symbol is missing." });
  });

  it("shows the full network message and says what to check", () => {
    const message = "Could not connect. The order may still have been placed.";
    const { text } = describeCommandError({ kind: "network", message }, host);
    expect(text).toContain(message);
    expect(text).toContain("Check the host URL and that OpenAlgo is running.");
  });

  it("shows the server message and HTTP status for an API error", () => {
    expect(
      describeCommandError({ kind: "api", message: "Invalid apikey", status: 403 }, host),
    ).toEqual({ text: "OpenAlgo error (HTTP 403): Invalid apikey." });
  });

  it("leaves out the status of an API error when there is none", () => {
    expect(describeCommandError({ kind: "api", message: "Rejected" }, host).text).toBe(
      "OpenAlgo error: Rejected.",
    );
  });

  it("points at the host URL for a reply that is not OpenAlgo's, keeping the raw reply as detail", () => {
    expect(
      describeCommandError({ kind: "decode", message: "<html>proxy</html>", status: 200 }, host),
    ).toEqual({
      text: `Unexpected reply from ${host} (HTTP 200). Check that the host URL points to OpenAlgo.`,
      detail: "<html>proxy</html>",
    });
  });
});

describe("asSentence", () => {
  it.each([
    ["done", "done."],
    ["done.", "done."],
    ["really?", "really?"],
    ["  ", "No details were given."],
  ])("%j becomes %j", (input, expected) => {
    expect(asSentence(input)).toBe(expected);
  });
});

import type { CommandError } from "../api/types";

export interface ErrorDescription {
  /** What went wrong and what to do about it, in plain words. */
  text: string;
  /** Technical detail too noisy for the main text, offered on hover. */
  detail?: string;
}

/**
 * Turns a rejected command into a message that tells the user what to do.
 * `hostUrl` is the server the command was sent to.
 *
 * Backend messages for validation, network and API errors are written for
 * the user and are always shown in full. A network message for an order can
 * warn that the order may still have been placed, so it must never be hidden.
 */
export function describeCommandError(error: CommandError, hostUrl: string): ErrorDescription {
  switch (error.kind) {
    case "validation":
      return { text: asSentence(error.message) };
    case "network":
      return {
        text: `${asSentence(error.message)} Check the host URL and that OpenAlgo is running.`,
      };
    case "api":
      return { text: `OpenAlgo error${httpStatus(error)}: ${asSentence(error.message)}` };
    case "decode":
      // The message carries an excerpt of whatever the server sent back.
      return {
        text: `Unexpected reply from ${hostUrl}${httpStatus(error)}. Check that the host URL points to OpenAlgo.`,
        detail: error.message,
      };
  }
}

function httpStatus(error: CommandError): string {
  return error.status === undefined ? "" : ` (HTTP ${error.status})`;
}

/** Ensures a message ends with a full stop so messages can be joined. */
export function asSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "") return "No details were given.";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

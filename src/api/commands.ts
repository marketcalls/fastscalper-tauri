import { invoke } from "@tauri-apps/api/core";
import type {
  CommandError,
  CommandErrorKind,
  Connection,
  Order,
  OrderResult,
  PingResult,
} from "./types";

/** Places a MARKET smart order through OpenAlgo. */
export function placeOrder(connection: Connection, order: Order): Promise<OrderResult> {
  return invoke<OrderResult>("place_order", { connection, order }).catch(rethrowAsCommandError);
}

/** Checks that the server is reachable and the API key has a live broker session. */
export function testConnection(connection: Connection): Promise<PingResult> {
  return invoke<PingResult>("test_connection", { connection }).catch(rethrowAsCommandError);
}

function rethrowAsCommandError(error: unknown): never {
  // Commands reject with the plain `CommandError` object the backend defines, not an Error.
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw toCommandError(error);
}

/**
 * Normalises anything a command can reject with into a `CommandError`.
 *
 * The backend always rejects with a typed `CommandError`. Anything else (a
 * plain string or an Error) comes from the Tauri IPC layer before the command
 * runs: arguments that fail to deserialise, an unknown command or a missing
 * permission. Nothing reached OpenAlgo in those cases, so they are reported
 * as "validation".
 */
export function toCommandError(error: unknown): CommandError {
  if (isCommandError(error)) return error;
  const message = error instanceof Error ? error.message : String(error);
  return { kind: "validation", message };
}

const COMMAND_ERROR_KINDS: readonly CommandErrorKind[] = ["validation", "network", "api", "decode"];

function isCommandError(value: unknown): value is CommandError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Record<keyof CommandError, unknown>>;
  return (
    COMMAND_ERROR_KINDS.some((kind) => kind === candidate.kind) &&
    typeof candidate.message === "string" &&
    (candidate.status === undefined || typeof candidate.status === "number")
  );
}

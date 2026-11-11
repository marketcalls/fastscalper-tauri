/**
 * A stand-in for the Rust backend, installed with Tauri's own IPC mocks.
 * No test ever reaches a real OpenAlgo server.
 */
import type { InvokeArgs } from "@tauri-apps/api/core";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";

export interface IpcCall {
  cmd: string;
  args: InvokeArgs | undefined;
}

type Handler = (args: InvokeArgs | undefined) => unknown;

/** Window commands every screen issues and that most tests do not care about. */
const DEFAULT_HANDLERS: Record<string, Handler> = {
  "plugin:window|set_always_on_top": () => null,
  "plugin:window|inner_size": () => ({ width: 320, height: 125 }),
  "plugin:window|scale_factor": () => 1,
  "plugin:window|set_size": () => null,
};

/**
 * Routes each IPC command to its handler and records every call. A command
 * without a handler rejects, so an unexpected order can never pass silently.
 */
export function installFakeBackend(handlers: Record<string, Handler> = {}): IpcCall[] {
  const calls: IpcCall[] = [];
  const routes = { ...DEFAULT_HANDLERS, ...handlers };
  mockWindows("main");
  mockIPC((cmd, args) => {
    calls.push({ cmd, args });
    const handler = routes[cmd];
    if (handler === undefined) throw new Error(`Unexpected IPC command in test: ${cmd}`);
    return handler(args);
  });
  return calls;
}

export function callsTo(calls: readonly IpcCall[], cmd: string): IpcCall[] {
  return calls.filter((call) => call.cmd === cmd);
}

/** Rejects the way a Tauri command does: with the plain serialised error object. */
export function rejectWith(value: unknown): Promise<never> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- mirrors the IPC wire format
  return Promise.reject(value);
}

/** A promise the test resolves or rejects by hand, to hold a command in flight. */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

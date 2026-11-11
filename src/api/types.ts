/**
 * Types shared with the Rust backend over Tauri IPC.
 *
 * These mirror the serde types in `src-tauri/src/openalgo/models.rs` and
 * `src-tauri/src/error.rs`. Change both sides together.
 */

export const EXCHANGES = ["NSE", "NFO", "CDS", "BSE", "BFO", "BCD", "MCX", "NCDEX"] as const;
export type Exchange = (typeof EXCHANGES)[number];

export const PRODUCTS = ["CNC", "NRML", "MIS"] as const;
export type Product = (typeof PRODUCTS)[number];

export type Action = "BUY" | "SELL";

/** Where the OpenAlgo server lives and how to authenticate with it. */
export interface Connection {
  hostUrl: string;
  apiKey: string;
}

/** A market order. A quantity of 0 asks OpenAlgo to close the open position. */
export interface Order {
  symbol: string;
  exchange: Exchange;
  product: Product;
  action: Action;
  quantity: number;
}

export interface OrderResult {
  status: string;
  orderId?: string;
  message?: string;
}

export interface PingResult {
  broker: string;
  message: string;
}

export type CommandErrorKind = "validation" | "network" | "api" | "decode";

/** Shape of every rejected command promise. */
export interface CommandError {
  kind: CommandErrorKind;
  message: string;
  status?: number;
}

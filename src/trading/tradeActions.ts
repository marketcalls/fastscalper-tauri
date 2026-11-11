/**
 * The four order buttons and the exact order each one sends.
 *
 * Exits send quantity 0: OpenAlgo's smart order with position size 0 closes
 * whatever position is open for the symbol, whatever its size.
 */
import type { Action, Exchange, Order, Product } from "../api/types";
import type { Ticket } from "./ticket";

export const TRADE_ACTION_IDS = ["LE", "LX", "SE", "SX"] as const;
export type TradeActionId = (typeof TRADE_ACTION_IDS)[number];

export interface TradeAction {
  id: TradeActionId;
  /** Short description shown under the code on the button. */
  label: string;
  side: "long" | "short";
  isEntry: boolean;
  action: Action;
  /** Spoken when voice alerts are on. Matches FastScalper v0.1.0. */
  phrase: string;
}

export const TRADE_ACTIONS: Readonly<Record<TradeActionId, TradeAction>> = {
  LE: {
    id: "LE",
    label: "Long entry",
    side: "long",
    isEntry: true,
    action: "BUY",
    phrase: "Buy Order",
  },
  LX: {
    id: "LX",
    label: "Long exit",
    side: "long",
    isEntry: false,
    action: "SELL",
    phrase: "Buy Exit",
  },
  SE: {
    id: "SE",
    label: "Short entry",
    side: "short",
    isEntry: true,
    action: "SELL",
    phrase: "Short Order",
  },
  SX: {
    id: "SX",
    label: "Short exit",
    side: "short",
    isEntry: false,
    action: "BUY",
    phrase: "Short Exit",
  },
};

/** Where orders are routed. Chosen in Settings. */
export interface OrderRoute {
  exchange: Exchange;
  product: Product;
}

/** Builds the order a button sends. Exits always close the full position. */
export function buildOrder(id: TradeActionId, ticket: Ticket, route: OrderRoute): Order {
  const { action, isEntry } = TRADE_ACTIONS[id];
  return {
    symbol: ticket.symbol,
    exchange: route.exchange,
    product: route.product,
    action,
    quantity: isEntry ? ticket.quantity : 0,
  };
}

/** Status bar messages for the life of an order. Every message starts with the button code. */
import type { CommandError, Order, OrderResult } from "../api/types";
import { asSentence, describeCommandError } from "../feedback/describeError";
import { createStatus, type Status } from "../feedback/status";
import { TRADE_ACTIONS, type TradeActionId } from "./tradeActions";

export function orderSendingStatus(id: TradeActionId, order: Order): Status {
  const { isEntry, side } = TRADE_ACTIONS[id];
  const what = isEntry
    ? `${order.action === "BUY" ? "buying" : "selling"} ${order.quantity} ${order.symbol}`
    : `closing ${side} ${order.symbol}`;
  return createStatus("info", `${id}: ${what} on ${order.exchange} (${order.product}).`);
}

/**
 * OpenAlgo can succeed without placing anything, for example an exit when no
 * position is open. It then sends only a message, which is shown as neutral
 * information rather than a confirmed order.
 */
export function orderPlacedStatus(id: TradeActionId, result: OrderResult): Status {
  if (result.orderId !== undefined && result.orderId !== "") {
    return createStatus("success", `${id} placed. Order ID ${result.orderId}`);
  }
  if (result.message !== undefined && result.message.trim() !== "") {
    return createStatus("info", `${id}: ${asSentence(result.message)}`);
  }
  return createStatus("success", `${id}: order accepted.`);
}

export function orderRejectedStatus(id: TradeActionId, problem: string): Status {
  return createStatus("error", `${id}: ${problem}`);
}

/**
 * After a network error the order may or may not have reached the broker, so
 * the visible line leads with what to do; the explanation is in the tooltip.
 */
export function orderFailedStatus(id: TradeActionId, error: CommandError, hostUrl: string): Status {
  const { text, detail } = describeCommandError(error, hostUrl);
  if (error.kind === "network") {
    return createStatus(
      "error",
      `${id}: network error. Check the order book before retrying.`,
      text,
    );
  }
  return createStatus("error", `${id} failed. ${text}`, detail);
}

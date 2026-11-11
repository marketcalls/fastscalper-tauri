import { useRef, useState } from "react";
import { placeOrder, toCommandError } from "../api/commands";
import type { Status } from "../feedback/status";
import { speak } from "../lib/speech";
import { connectionOf, type Settings } from "../settings/settings";
import {
  orderFailedStatus,
  orderPlacedStatus,
  orderRejectedStatus,
  orderSendingStatus,
} from "./orderFeedback";
import { prepareOrder } from "./prepareOrder";
import type { TicketDraft } from "./ticket";
import { TRADE_ACTIONS, type TradeActionId } from "./tradeActions";

export interface OrderPlacement {
  /** Buttons whose order is waiting for a reply from OpenAlgo. */
  pending: ReadonlySet<TradeActionId>;
  submit: (id: TradeActionId, draft: TicketDraft) => Promise<void>;
}

/**
 * Sends orders and reports their progress.
 *
 * Each button has its own in-flight guard: a second press of the same button
 * is ignored until the first order is answered, while the other buttons stay
 * live. In particular an exit is never held up behind a slow entry.
 */
export function useOrderPlacement(
  settings: Settings,
  report: (status: Status) => void,
): OrderPlacement {
  // A ref rather than state, so two clicks in the same frame see each other.
  const inFlight = useRef(new Set<TradeActionId>());
  const [pending, setPending] = useState<ReadonlySet<TradeActionId>>(() => new Set());

  function setInFlight(id: TradeActionId, isInFlight: boolean): void {
    if (isInFlight) inFlight.current.add(id);
    else inFlight.current.delete(id);
    setPending(new Set(inFlight.current));
  }

  async function submit(id: TradeActionId, draft: TicketDraft): Promise<void> {
    if (inFlight.current.has(id)) return;

    const prepared = prepareOrder(id, draft, settings);
    if (!prepared.ok) {
      report(orderRejectedStatus(id, prepared.problem));
      return;
    }

    setInFlight(id, true);
    if (settings.voiceAlerts) speak(TRADE_ACTIONS[id].phrase);
    report(orderSendingStatus(id, prepared.order));
    try {
      const result = await placeOrder(connectionOf(settings), prepared.order);
      report(orderPlacedStatus(id, result));
    } catch (error) {
      report(orderFailedStatus(id, toCommandError(error), settings.hostUrl));
    } finally {
      setInFlight(id, false);
    }
  }

  return { pending, submit };
}

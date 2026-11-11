import type { Order } from "../api/types";
import { hasApiKey, type Settings } from "../settings/settings";
import { validateHostUrl } from "../settings/validation";
import { normaliseSymbolInput, parseQuantity, type TicketDraft } from "./ticket";
import { buildOrder, TRADE_ACTIONS, type TradeActionId } from "./tradeActions";

export type PreparedOrder = { ok: true; order: Order } | { ok: false; problem: string };

/**
 * Checks everything that can be checked locally before an order leaves the
 * app, and builds the order when nothing is wrong. Exits ignore the quantity
 * input, so a half-typed quantity can never stop a position being closed.
 */
export function prepareOrder(
  id: TradeActionId,
  draft: TicketDraft,
  settings: Settings,
): PreparedOrder {
  if (!hasApiKey(settings)) {
    return { ok: false, problem: "Add your OpenAlgo API key in Settings first." };
  }
  if (validateHostUrl(settings.hostUrl) !== null) {
    return { ok: false, problem: "The host URL in Settings is not a valid URL." };
  }

  const symbol = normaliseSymbolInput(draft.symbol);
  if (symbol === "") {
    return { ok: false, problem: "Enter a symbol." };
  }

  let quantity = 0;
  if (TRADE_ACTIONS[id].isEntry) {
    const parsed = parseQuantity(draft.quantity);
    if (parsed === null) {
      return { ok: false, problem: "Enter a whole-number quantity of 1 or more." };
    }
    quantity = parsed;
  }

  return { ok: true, order: buildOrder(id, { symbol, quantity }, settings) };
}

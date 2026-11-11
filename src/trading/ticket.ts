/**
 * The symbol and quantity on the order pad, and the rules for turning what
 * the user typed into values that can go into an order.
 */

/** A validated ticket, as remembered between sessions. */
export interface Ticket {
  symbol: string;
  quantity: number;
}

/** The raw text in the symbol and quantity inputs. */
export interface TicketDraft {
  symbol: string;
  quantity: string;
}

export const DEFAULT_TICKET: Readonly<Ticket> = { symbol: "", quantity: 1 };

/** The backend reads quantities as an unsigned 32-bit integer. */
const MAX_QUANTITY = 4_294_967_295;

/**
 * Cleans symbol input as it is typed. OpenAlgo symbols are upper case and
 * never contain spaces, so this removes a common source of rejected orders.
 */
export function normaliseSymbolInput(text: string): string {
  return text.replace(/\s+/g, "").toUpperCase();
}

/**
 * Keeps only digits in the quantity input. A plain text input is used instead
 * of type="number" so a stray scroll wheel cannot change the quantity.
 */
export function normaliseQuantityInput(text: string): string {
  return text.replace(/\D+/g, "");
}

/** Returns the quantity as a whole number of at least 1, or null when it is not one. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const quantity = Number(trimmed);
  return quantity >= 1 && quantity <= MAX_QUANTITY ? quantity : null;
}

/** Converts the inputs into a ticket worth remembering, using defaults for anything invalid. */
export function ticketFromDraft(draft: TicketDraft): Ticket {
  return {
    symbol: normaliseSymbolInput(draft.symbol),
    quantity: parseQuantity(draft.quantity) ?? DEFAULT_TICKET.quantity,
  };
}

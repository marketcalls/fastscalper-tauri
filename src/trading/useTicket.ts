import { useEffect, useRef, useState } from "react";
import type { SettingsStorage } from "../settings/storage";
import {
  normaliseQuantityInput,
  normaliseSymbolInput,
  ticketFromDraft,
  type Ticket,
  type TicketDraft,
} from "./ticket";

/** Waits for a pause in typing so the file is not rewritten on every keystroke. */
export const TICKET_SAVE_DELAY_MS = 500;

export interface TicketInputs {
  draft: TicketDraft;
  setSymbol: (text: string) => void;
  setQuantity: (text: string) => void;
}

/** Holds the symbol and quantity inputs and remembers them between sessions. */
export function useTicket(
  initial: Ticket,
  storage: Pick<SettingsStorage, "saveTicket">,
): TicketInputs {
  const [symbol, setSymbol] = useState(initial.symbol);
  const [quantity, setQuantity] = useState(String(initial.quantity));
  const lastSaved = useRef(initial);

  useEffect(() => {
    const ticket = ticketFromDraft({ symbol, quantity });
    if (sameTicket(ticket, lastSaved.current)) return;

    const timer = window.setTimeout(() => {
      lastSaved.current = ticket;
      storage.saveTicket(ticket).catch((error: unknown) => {
        // Not worth interrupting trading for: the inputs still work.
        console.warn("Could not remember the ticket", error);
      });
    }, TICKET_SAVE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [symbol, quantity, storage]);

  return {
    draft: { symbol, quantity },
    setSymbol: (text: string) => {
      setSymbol(normaliseSymbolInput(text));
    },
    setQuantity: (text: string) => {
      setQuantity(normaliseQuantityInput(text));
    },
  };
}

function sameTicket(a: Ticket, b: Ticket): boolean {
  return a.symbol === b.symbol && a.quantity === b.quantity;
}

import { useId } from "react";
import { cx } from "../../lib/classNames";
import { TRADE_ACTIONS, type TradeActionId } from "../../trading/tradeActions";
import type { TicketInputs } from "../../trading/useTicket";
import { IconButton } from "../Button/Button";
import { GearIcon } from "../Icon/Icon";
import styles from "./OrderPad.module.css";
import { TradeButton } from "./TradeButton";

interface OrderPadProps {
  ticket: TicketInputs;
  pending: ReadonlySet<TradeActionId>;
  /** False until an API key is configured; the settings button is then highlighted. */
  canTrade: boolean;
  onTrade: (id: TradeActionId) => void;
  onOpenSettings: () => void;
}

/**
 * The v0.1.0 layout: symbol, quantity and settings on one row, then the four
 * order buttons in one row (LE, LX, SE, SX) so muscle memory still works.
 *
 * There is deliberately no keyboard shortcut and no form submit here: an
 * order is only ever sent by pressing one of the buttons.
 */
export function OrderPad({ ticket, pending, canTrade, onTrade, onOpenSettings }: OrderPadProps) {
  const symbolId = useId();
  const quantityId = useId();

  const button = (id: TradeActionId) => (
    <TradeButton
      action={TRADE_ACTIONS[id]}
      pending={pending.has(id)}
      disabled={!canTrade}
      onPress={() => {
        onTrade(id);
      }}
    />
  );

  return (
    <section className={styles.pad} aria-label="Order pad">
      <div className={styles.ticket}>
        <div className={cx(styles.field, styles.symbol)}>
          <label htmlFor={symbolId} className={styles.label}>
            Symbol
          </label>
          <input
            id={symbolId}
            className={styles.input}
            value={ticket.draft.symbol}
            onChange={(event) => {
              ticket.setSymbol(event.target.value);
            }}
            placeholder="e.g. SBIN"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={quantityId} className={styles.label}>
            Qty
          </label>
          <input
            id={quantityId}
            className={cx(styles.input, styles.quantity)}
            value={ticket.draft.quantity}
            onChange={(event) => {
              ticket.setQuantity(event.target.value);
            }}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <IconButton
          label="Settings"
          className={cx(!canTrade && styles.needsAttention)}
          onClick={onOpenSettings}
        >
          <GearIcon size={14} />
        </IconButton>
      </div>

      <div className={styles.actions}>
        <div role="group" aria-label="Long" className={styles.group}>
          {button("LE")}
          {button("LX")}
        </div>
        <div role="group" aria-label="Short" className={styles.group}>
          {button("SE")}
          {button("SX")}
        </div>
      </div>
    </section>
  );
}

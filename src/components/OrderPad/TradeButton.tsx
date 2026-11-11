import { cx } from "../../lib/classNames";
import type { TradeAction } from "../../trading/tradeActions";
import styles from "./TradeButton.module.css";

interface TradeButtonProps {
  action: TradeAction;
  /** True while this button's order is waiting for OpenAlgo. */
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}

/**
 * One order button, labelled with its code only (LE, LX, SE, SX) as in
 * v0.1.0; the long name is the tooltip. Long is green and short is red;
 * entries are filled and exits are outlined, so the four stay distinct even
 * without colour.
 *
 * While pending the button stays focusable (aria-disabled rather than
 * disabled) so keyboard focus is not lost; the order hook ignores presses.
 */
export function TradeButton({ action, pending, disabled, onPress }: TradeButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        styles.button,
        styles[action.side],
        action.isEntry ? styles.entry : styles.exit,
        pending && styles.pending,
      )}
      title={action.label}
      disabled={disabled}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={onPress}
    >
      {pending && <span className={styles.spinner} aria-hidden="true" />}
      {action.id}
    </button>
  );
}

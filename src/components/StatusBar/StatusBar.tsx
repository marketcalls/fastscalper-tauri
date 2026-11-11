import { formatClock, type Status } from "../../feedback/status";
import { cx } from "../../lib/classNames";
import type { OrderRoute } from "../../trading/tradeActions";
import styles from "./StatusBar.module.css";

interface StatusBarProps {
  status: Status | null;
  route: OrderRoute;
  /** True when no API key is configured, so trading cannot start yet. */
  needsSetup: boolean;
}

/**
 * One thin line under the buttons with the latest result. Long text is cut
 * with an ellipsis; hovering shows the time and the full message. Messages
 * stay until the next one replaces them, so the last order ID can be read.
 */
export function StatusBar({ status, route, needsSetup }: StatusBarProps) {
  const idleText = needsSetup
    ? "Add your OpenAlgo API key in Settings to trade."
    : `Ready: ${route.exchange} ${route.product}`;
  const text = status?.text ?? idleText;
  const fullText =
    status === null
      ? idleText
      : [formatClock(status.at), status.text, status.detail].filter(Boolean).join(" ");

  return (
    <p
      role="status"
      className={cx(styles.line, status === null ? styles.idle : styles[status.tone])}
      title={fullText}
    >
      {text}
    </p>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/classNames";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

/** A general-purpose button. Order buttons use `TradeButton` instead. */
export function Button({
  variant = "secondary",
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(styles.button, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required because the icon itself is hidden from assistive technology. */
  label: string;
  children: ReactNode;
}

/** A square button that shows only an icon. */
export function IconButton({
  label,
  type = "button",
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(styles.button, styles.secondary, styles.icon, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

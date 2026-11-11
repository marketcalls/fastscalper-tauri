import type { ReactNode } from "react";
import styles from "./fields.module.css";

interface FieldProps {
  /** Id of the control, so the label points at it. */
  controlId: string;
  label: string;
  /** Rendered with id `errorId`, which the control should reference in aria-describedby. */
  error?: string | undefined;
  errorId?: string;
  children: ReactNode;
}

/** Label on the left, control on the right, error message underneath. */
export function Field({ controlId, label, error, errorId, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>{children}</div>
      {error !== undefined && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

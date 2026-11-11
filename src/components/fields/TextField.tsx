import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { Field } from "./Field";
import styles from "./fields.module.css";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange" | "className"
>;

interface TextFieldProps extends NativeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  /** Shown inside the field, after the input (for example a button). */
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  trailing,
  ref,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = error !== undefined;

  return (
    <Field controlId={id} label={label} error={error} errorId={errorId}>
      <input
        ref={ref}
        id={id}
        className={styles.input}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        {...rest}
      />
      {trailing}
    </Field>
  );
}

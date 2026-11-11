import { useId } from "react";
import { Field } from "./Field";
import styles from "./fields.module.css";

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const id = useId();

  return (
    <Field controlId={id} label={label}>
      <select
        id={id}
        className={styles.input}
        value={value}
        onChange={(event) => {
          // Map back to the typed option; the DOM only knows strings.
          const chosen = options.find((option) => option === event.target.value);
          if (chosen !== undefined) onChange(chosen);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

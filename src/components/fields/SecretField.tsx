import { useState, type ComponentProps } from "react";
import { IconButton } from "../Button/Button";
import { EyeIcon, EyeOffIcon } from "../Icon/Icon";
import { TextField } from "./TextField";

type SecretFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

/** A masked text field with a button that shows or hides the value. */
export function SecretField({ label, ...rest }: SecretFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      label={label}
      type={visible ? "text" : "password"}
      autoComplete="off"
      spellCheck={false}
      trailing={
        <IconButton
          label={`Show ${label}`}
          aria-pressed={visible}
          onClick={() => {
            setVisible((current) => !current);
          }}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </IconButton>
      }
      {...rest}
    />
  );
}

/**
 * Inline SVG icons. They are decorative: the control that contains one must
 * carry its own accessible name (for example `aria-label`).
 */
import type { ReactNode } from "react";

interface IconProps {
  size?: number;
}

function SvgIcon({ size = 16, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M10.08 4.85L10.61 2.1L13.39 2.1L13.92 4.85L15.7 5.59L18.02 4.01L19.99 5.98L18.41 8.3L19.15 10.08L21.9 10.61L21.9 13.39L19.15 13.92L18.41 15.7L19.99 18.02L18.02 19.99L15.7 18.41L13.92 19.15L13.39 21.9L10.61 21.9L10.08 19.15L8.3 18.41L5.98 19.99L4.01 18.02L5.59 15.7L4.85 13.92L2.1 13.39L2.1 10.61L4.85 10.08L5.59 8.3L4.01 5.98L5.98 4.01L8.3 5.59Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </SvgIcon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 3l18 18" />
    </SvgIcon>
  );
}

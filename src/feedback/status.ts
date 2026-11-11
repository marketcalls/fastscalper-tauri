/** A message for the one-line status bar. */
export interface Status {
  tone: StatusTone;
  /** The line itself. Put what matters most first: a long line is cut short. */
  text: string;
  /** More about the message, added after it in the tooltip. */
  detail?: string;
  at: Date;
}

export type StatusTone = "info" | "success" | "warning" | "error";

export function createStatus(tone: StatusTone, text: string, detail?: string): Status {
  const status: Status = { tone, text, at: new Date() };
  if (detail !== undefined) status.detail = detail;
  return status;
}

/** Formats a time as HH:MM:SS (24 hour), matching broker order books. */
export function formatClock(date: Date): string {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

/** Best-effort text for an error of unknown shape. */
export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : JSON.stringify(error);
}

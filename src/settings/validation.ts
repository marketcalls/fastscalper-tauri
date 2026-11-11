import type { Settings } from "./settings";

/** Fields that can be invalid, mapped to a message that says how to fix them. */
export type SettingsErrors = Partial<Record<"apiKey" | "hostUrl", string>>;

export function validateApiKey(value: string): string | null {
  return value.trim() === "" ? "Enter your OpenAlgo API key." : null;
}

export function validateHostUrl(value: string): string | null {
  const text = value.trim();
  if (text === "") return "Enter the OpenAlgo host URL.";

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "Enter a full URL, for example http://127.0.0.1:5000.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "The host URL must start with http:// or https://.";
  }
  return null;
}

export function validateSettings(settings: Pick<Settings, "apiKey" | "hostUrl">): SettingsErrors {
  const errors: SettingsErrors = {};
  const apiKey = validateApiKey(settings.apiKey);
  const hostUrl = validateHostUrl(settings.hostUrl);
  if (apiKey !== null) errors.apiKey = apiKey;
  if (hostUrl !== null) errors.hostUrl = hostUrl;
  return errors;
}

export function hasErrors(errors: SettingsErrors): boolean {
  return Object.keys(errors).length > 0;
}

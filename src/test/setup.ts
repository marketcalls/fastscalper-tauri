import "@testing-library/jest-dom/vitest";
import { clearMocks } from "@tauri-apps/api/mocks";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installDialogPolyfill } from "./dialogPolyfill";

installDialogPolyfill();

afterEach(() => {
  cleanup();
  clearMocks();
  localStorage.clear();
});

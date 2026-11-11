import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set by `tauri dev` when targeting a remote device; unset for desktop work.
const devHost = process.env.TAURI_DEV_HOST;

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],

  // Keep Rust compiler errors visible in the terminal.
  clearScreen: false,

  server: {
    // Tauri expects this fixed port (see build.devUrl in tauri.conf.json).
    port: 1420,
    strictPort: true,
    host: devHost ?? false,
    hmr: devHost ? { protocol: "ws", host: devHost, port: 1421 } : undefined,
    watch: {
      // The Rust side is rebuilt by the Tauri CLI, and coverage reports are
      // test output; neither should reload the app.
      ignored: ["**/src-tauri/**", "**/coverage/**"],
    },
  },

  // Expose TAURI_ENV_* variables (platform, debug flag) to the frontend.
  envPrefix: ["VITE_", "TAURI_ENV_"],

  build: {
    // Match the WebView engines Tauri 2 ships on each platform.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
});

import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      // Every test starts from clean spies and real globals.
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/main.tsx", "src/test/**", "src/**/*.test.{ts,tsx}"],
        reporter: ["text", "html", "lcov"],
        thresholds: {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 75,
        },
      },
    },
  }),
);

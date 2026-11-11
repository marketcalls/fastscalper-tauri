// ESLint flat config for the frontend. The Rust side is linted by Clippy.
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "coverage", "src-tauri", ".github"]),

  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Numbers in messages (quantities, HTTP status codes) are intentional.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },

  {
    files: ["src/**/*.test.{ts,tsx}"],
    rules: {
      // `await act(async () => render(...))` is how React 19 flushes work that
      // settles after the callback, such as a suspended first render.
      "@typescript-eslint/require-await": "off",
    },
  },

  {
    files: ["*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },

  {
    files: ["**/*.js"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
  },

  // Turns off stylistic rules that would fight Prettier. Keep last.
  prettier,
]);

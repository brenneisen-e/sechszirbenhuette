import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default defineConfig([
  globalIgnores(["**/dist/", "**/node_modules/", "**/coverage/", "**/*.d.ts", ".next/", ".open-next/"]),

  js.configs.recommended,

  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      tseslint.configs.strict,
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat["jsx-runtime"],
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "eqeqeq": "error",
      "prefer-const": "error",
      "curly": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  { files: ["src/**/*.{ts,tsx}"], ...reactHooks.configs["recommended-latest"] },

  { files: ["**/*.{js,mjs,cjs}"], extends: [tseslint.configs.disableTypeChecked] },

  prettierConfig,
]);

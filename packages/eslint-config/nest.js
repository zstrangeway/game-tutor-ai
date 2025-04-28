import { config as baseConfig } from "./base.js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * ESLint configuration for NestJS applications.
 *
 * @type {import("eslint").Linter.Config}
 */
export const config = [
  ...baseConfig,
  eslintPluginPrettierRecommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: "module",
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
    },
  },
]

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // setState inside .then() / async callback is not a synchronous cascade. Safe to allow.
      "react-hooks/set-state-in-effect": "off",
      "react-compiler/react-compiler": "off",
      // Allowing 'any' for now in API response boundaries
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused imports are warnings during active development
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
